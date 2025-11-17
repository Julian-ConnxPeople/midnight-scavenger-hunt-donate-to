import { canonicalizePhraseLowerCase, canonicalizeWord, canonicalizeString } from "../utils/canonicalize.js"

export class Config {
    constructor(yaml) {
        console.log("Loading and validate config");

        const test_only = yaml?.mode?.test_only;
        if(typeof test_only !== 'boolean')
            throw Error(`The key [mode.test_only] for the API is missing or not defined correctly in the configuration file. Please define it and set to true for testing.`);
        this.mode = yaml.mode;

        const operation = yaml.mode?.operation;
        if (!operation || typeof operation !== 'string')
            throw Error(`The key [mode.operation] for the API is missing or not defined correctly in the configuration file. Please define it correctly.`);

        const allowedOperations = new Set(['donate', 'check_donate']);
        if (!allowedOperations.has(operation))
            throw Error(`Please define a valid operation (donate, check_donate).`);
        this.mode.operation = operation;

        const api_url = yaml?.api?.url;
        if(!api_url)
            throw Error(`The key [api.url] for the API is missing in the configuration file.`)
        this.api = yaml.api;
        this.api.url = canonicalizeString(api_url);

        const sleep_between_calls_ms = yaml.api?.sleep_between_calls_ms;
        if(!sleep_between_calls_ms || typeof sleep_between_calls_ms !== 'number')
            this.api.sleep_between_calls_ms = 500;
        if(sleep_between_calls_ms < 100) {
            this.api.sleep_between_calls_ms = 100;
            console.warn("Applying a minimum of 100ms between calls. This is also very low, consider setting higher and not flooding server.");
        }

        console.log("Checking wallet configs");

        // Validate source_wallets structure
        const wallets = yaml?.source_wallets;
        if (!wallets || Object.keys(wallets).length === 0) {
            throw new Error("No wallets found in source_wallets.");
        }
        this.source_wallets = wallets;

        // Loop through each wallet and validate the structure
        for (const wallet_name in wallets) {
            const wallet = wallets[wallet_name];

            // Check force donations
            let force_donations = wallet?.force_donations;
            if(!force_donations)
                force_donations = yaml?.global_wallet_settings?.force_donations;
            if(!force_donations) {
                force_donations = false; // Set default if not provided at all
                console.warn(`Using default [force_donations] for wallet '${wallet_name}' to [false] as none specified.`);
            }
            if(typeof force_donations !== 'boolean')
                throw Error(`The key [wallet.force_donations] is missing or not defined correctly in the configuration file. Please define/set it correctly or remove.`);

            this.source_wallets[wallet_name].force_donations = force_donations;

            let mnemonic = wallet?.private_key?.mnemonic;
            if (!mnemonic || mnemonic.length === 0) {
                throw new Error(`Missing or invalid [private_key.mnemonic] for wallet [${wallet_name}].`);
            }
            this.source_wallets[wallet_name].private_key.mnemonic = canonicalizePhraseLowerCase(mnemonic);
            this.source_wallets[wallet_name].wallet_type = 'MultiAccountShelleyWallet'; // Only one type supported currently so fixed here for now

            // Get wallet specific account_range or fall back to global settings
            let account_range = wallet?.account_range;
            if(!account_range)
                account_range = yaml?.global_wallet_settings?.account_range;
            if(!account_range) {
                account_range =  { start: 0, end: 0 };  // Set default range if not valid
                console.warn(`Using default [account_range] for wallet '${wallet_name}' { start: 0, end: 0 } as none specified.`);
            }            
            if (typeof account_range?.start !== 'number' || typeof account_range?.end !== 'number')
                throw new Error(`Invalid [account_range] for wallet [${wallet_name}]. Both [start] and [end] must be defined and be valid numbers.`);
            // Ensure start is less than or equal to end
            if (account_range.start > account_range.end)
                throw new Error(`Invalid [account_range.start or end] for wallet [${wallet_name}]. [start] cannot be greater than [end].`);
            // Update wallet with the final account range
            this.source_wallets[wallet_name].account_range = account_range;

            // Get wallet specific payment_address_type or fall back to global settings
            let payment_address_type = wallet?.payment_address_type;
            if(!payment_address_type)
                payment_address_type = yaml?.global_wallet_settings?.payment_address_type;
            if(!payment_address_type)
                payment_address_type = 'ShelleyBech32';
            // Update wallet with the final address type
            this.source_wallets[wallet_name].payment_address_type = canonicalizeWord(payment_address_type);

            // Get wallet specific payment_address_range or fall back to global settings
            
            let payment_address_range = wallet?.payment_address_range;
            if(!payment_address_range) {
                console.warn(`Using default [payment_address_range] for wallet [${wallet_name}] { start: 0, end: 0 } as none specified.`);
                payment_address_range= { start: 0, end: 0 };  // Set default range
            }
            if (typeof payment_address_range?.start !== 'number' || typeof payment_address_range?.end !== 'number')
                throw new Error(`Invalid [payment_address_range] for wallet [${wallet_name}]. Both [start] and [end] must be defined and be valid numbers.`);
            // Ensure start is less than or equal to end
            if (payment_address_range.start > payment_address_range.end)
                throw new Error(`Invalid [payment_address_range.start or end] for wallet [${wallet_name}]. [start] cannot be greater than [end].`);
            // Update wallet with the final address range info
            this.source_wallets[wallet_name].payment_address_range = payment_address_range;

            // Validate payment addresses if present
            let payment_addresses = wallet?.payment_addresses;
            if(payment_addresses) {
                // Make sure the address range is valid for the provided payment addresses
                if(payment_address_range.end + 1 - payment_address_range.start !== payment_addresses.length)
                    throw new Error(`As [payment_addresses] is defined, [payment_address_range] must match length (or don't specify the range but then no dest public key verify) for wallet [${wallet_name}].`);

                if(account_range.start !== account_range.end)
                    throw new Error(`When using [payment_addresses] for wallet [${wallet_name}], [account_range] must have matching start and end (for single account).`);

                if(!Array.isArray(wallet.payment_addresses) && wallet.payment_addresses.length > 0)
                    throw new Error(`Invalid or missing [payment_addresses] array for wallet [${wallet_name}]. Must be a non-empty valid array of addresses.`);

                // Validate each payment address to ensure it's not empty
                wallet.payment_addresses.forEach((payment_address, index) => {
                    if (!payment_address || payment_address.length === 0) {
                        throw new Error(`Invalid [payment_address] at index ${index} for wallet [${wallet_name}]. Payment address cannot be empty.`);
                    }
                });

                // Transform the array using canonicalizeWord
                this.source_wallets[wallet_name].payment_addresses = wallet.payment_addresses.map(payment_address => canonicalizeWord(payment_address));
            }
        }

        console.log("Checking destination configs");

        // Validate destination_address structure
        const destination_address = yaml?.destination_address;
        if (!destination_address) {
            throw new Error("[destination_address] is missing.");
        }
        this.destination_address = destination_address;

        const { 
            account_public_key: destination_account_public_key, 
            account_public_key_type: destination_account_public_key_type, 
            account_payment_address_index: destination_account_payment_address_index, 
            payment_address: destination_payment_address,
            payment_address_type: destination_payment_address_type
        } = destination_address;

        // Payment address is mandatory
        if (!destination_payment_address || destination_payment_address.length === 0)
            throw new Error("Missing or invalid [payment_address] in [destination_address].");
        if(!destination_payment_address_type) {
            // Update wallet with the final address type
            this.destination_address.payment_address_type = 'ShelleyBech32';
        }

        // Account information is optional, but if any of these fields are provided, they must all be provided
        const account_fields = [destination_account_public_key, destination_account_public_key_type, destination_account_payment_address_index];
        const any_account_field_defined = account_fields.some(field => field !== undefined);

        if (any_account_field_defined) {
            // All account fields must be provided if any are present
            if (account_fields.includes(undefined))
                throw new Error("Incomplete account information in [destination_address]. All [account_*] fields must be provided.");
            if (typeof destination_account_payment_address_index !== 'number')
                throw new Error(`Invalid [account_payment_address_index] for wallet [${wallet_name}]. [account_payment_address_index] must be defined and be a valid number.`);
            if(!destination_account_public_key_type || destination_account_public_key_type.length === 0 )
                throw new Error("Invalid [account_public_key_type] in [destination_address]. It cannot be empty.");
            if(!destination_account_public_key || destination_account_public_key.length === 0 )
                throw new Error("Invalid [account_public_key] in [destination_address]. It cannot be empty.");
            
            this.destination_address.account_public_key = canonicalizeWord(destination_account_public_key);
            this.destination_address.account_public_key_type = canonicalizeWord(destination_account_public_key_type);
        } else {
            // If account info is missing, set the destination address and log a warning
            console.warn("[account_*] information is not provided in [destination_address]. Public address verification will not be performed.");
        }

        this.destination_address.payment_address = canonicalizeWord(destination_payment_address);
        this.destination_address.payment_address_type = canonicalizeWord(destination_payment_address_type);
        this.destination_address.has_account_info = any_account_field_defined;
    }
}