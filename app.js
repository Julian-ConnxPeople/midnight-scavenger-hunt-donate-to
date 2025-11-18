import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { resolve, extname }  from 'path';
import { fileURLToPath } from 'url';
import { Config } from './src/config/config.js';
import {
    WalletKeys, WalletPaymentAndStakingAccountKeys, WalletPaymentAccountAddressKeys, WalletStakingAccountAddressKeys, PaymentPublicAddressKeys, 
    deriveWalletKeys, derivePaymentPublicAddressKeysFromPublicAccountKey, derivePaymentAddressFromKeys
} from './src/keys/derive.js';
import { getAddressInHexAndVerify } from './src/address/address.js';
import { signDonation } from './src/signing/signature.js';
import { sendDonation } from './src/api/donate_to.js';

// Convert import.meta.url to __filename
const __filename = fileURLToPath(import.meta.url);

// Derive __dirname from __filename
const __dirname = path.dirname(__filename);

// Importing from local files
//import { readAddr2hex, signCIP8, verifyCIP8 } from './cardano-signer/src/cardano-signer.js';

// Importing from third-party packages
//import CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
//import bip39 from 'bip39';
//import axios from 'axios';

console.log("Running Midnight Scavenger Hunt Donations");

// ********************************************************
//
// USING THIS SCRIPT IS INHERENTLY UNSAFE AS IT REQUIRES LOADING AND USING YOUR MNEMONICS
// ADDITIONALLY IT IS FOR YOU TO ENSURE THE PROVIDED DESTINATION ADDRESS IS REALLY THE ONE YOU WANT
//
// THE DEFAULT MODE IS TESTING WITHOUT SENDING ANTHING TO THE API (you need to change test_run flag below to submit)
//
// THIS SCRIPT IS PROVIDED OPEN SOURCE JUST TO HELP EDUCATION AND ALSO ALLOW
// PEOPLE TO HAVE A QUICK SOLUTION FOR MERGING ADDRESSES FROM THE NIGHT SCAVANGER HUNT
// 
// THIS SCRIPT IS BUILT PURELY ON OPEN SOURCE PROJECTS SO YOU CAN VERIFY THE LOGIC YOURSELF
// AND HAVE CONFIDENCE
//
// ANY ADDRESSES COMMENTED OUT FOR TESTING IN THIS FILE ARE EXAMPLES ONLY (MOSTLY TAKEN FROM THE MIDNIGHT API DOCS).
//
// ## Disclaimer
//
// By using this software, you agree to use it at your own risk. The author and contributors are not responsible for any damage, loss of data, financial loss, or legal issues arising from the use, misuse, or inability to use this software. 
//
// This software is provided "as-is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. The author does not guarantee the accuracy, completeness, or security of the software and is not liable for any errors, omissions, or vulnerabilities that may exist within the code.
//
// You acknowledge and agree that the author and contributors will not be held responsible for any claims, damages, or other liabilities, whether in an action of contract, tort, or otherwise, arising from the use of this software.
//
// If you choose to use this software in production systems or for handling critical data (e.g., financial transactions, personal information), you do so at your own risk. The author strongly advises testing and auditing the software thoroughly before using it in production environments.
//
// ### Indemnity
//
// By using this software, you agree to indemnify, defend, and hold harmless the author and contributors from any claims, damages, losses, or expenses, including but not limited to legal fees, arising from your use of the software or violation of this disclaimer.
//
// ********************************************************

// ********************************************************
// More info:
//
// This script has been tested with at least the following -
//   1) Dontated from:
//        Lace multi account wallet (Browser Extension - account 0 address 0)
//      To:
//        Vespr wallet address (uses account 0, also had public key verification on so i know it went to me)
//   2) Donated from:
//        Lace multi account wallet (Browser Extension - account 0 address 0)
//      To:
//        Lace multi account wallet (Browser Extension - account 0 address 0)
//   3) MY NEXT USE CASE IS TO DO IT FOR SHADOW HARVESTER ADDRESSES (then hopefully bulk load from file if time)
//
// ********************************************************

// ********************************************************
// Set whether a test run or not - default is true, so you need to change this once you are happy with output
// ********************************************************

// Sleep for a given number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process donations (delta or all)
async function processDonations(config, donation_state_entries, { signal }) {
    signal.throwIfAborted();  // immediate cancel check

    // Get destination payment public address keys if account info is present for verifcation for destination address if desired (account details specified in [destination_address])
    let destination_payment_public_address_keys;
    let destination_payment_public_address_raw_key_hex;
    
    console.log(`Load destination config`);

    if(config.destination_address.has_account_info) {
        const { 
            account_public_key: destination_account_public_key,
            account_public_key_type: destination_account_public_key_type, 
            account_payment_address_index: destination_account_payment_address_index
        } = config.destination_address;

        destination_payment_public_address_keys = derivePaymentPublicAddressKeysFromPublicAccountKey(destination_account_public_key, destination_account_public_key_type, destination_account_payment_address_index);
        destination_payment_public_address_raw_key_hex = destination_payment_public_address_keys.paymentPublicAddressRawKeyHex;
    }

    const { 
        payment_address: destination_payment_address,
        payment_address_type: destination_payment_address_type, 
    } = config.destination_address;

    let destination_payment_address_hex
    try {
        // Get destination address hex required for signature (and verify against public account key where possible)
        destination_payment_address_hex = getAddressInHexAndVerify(destination_payment_address, destination_payment_address_type, destination_payment_public_address_raw_key_hex);
    }
    catch(error) {
        throw new Error(`Failed to convert/verify destination payment address ${destination_payment_address}: ${error.message}`);
    }

    console.log(`Donation will be to ${destination_payment_address}`);

    // Loop through each wallet and generate combinations based on account range and payment address range or payment addresses
    for (const wallet_name in config.source_wallets) {
        console.log(`**********************************************************`);
        console.log(`Processing donations for wallet [${wallet_name}].`);
        console.log(`**********************************************************`);
        const wallet = config.source_wallets[wallet_name];

        // Get the account range and generate combinations based on the range
        const { account_range, force_donations } = wallet;
        const { start: account_start, end: account_end } = account_range;

        // Note all structure vaidations are done when cofiguration was loaded
        // So we can just loop accordingly for the valid structures

        // We could pass the pass phrase but for now was assume empty '' (this is not the same as wallet password but rather the 25th word!!)
        const wallet_keys = deriveWalletKeys(wallet_name, wallet.private_key.mnemonic, '');
        
        if(force_donations)
            console.log(`Force donations is on for wallet [${wallet_name}] so all will be retried and the status updated.`);
        else
            console.log(`Only delta donations for wallet [${wallet_name}] will be sent (non active or missing in state). Use force to override.`);

        // Loop through accounts in the range [start, end]
        for (let account_number = account_start; account_number <= account_end; account_number++) {
            const wallet_payment_and_staking_account_keys = new WalletPaymentAndStakingAccountKeys(wallet_name, wallet_keys.rootPrivateCoinTypeKey, account_number);
            // Get the staking key info that is address 0 (theoretically could be others, but wallets don't do that typically)
            const wallet_staking_account_address_keys = new WalletStakingAccountAddressKeys(wallet_payment_and_staking_account_keys.stakingChainPrivateKey, 0);
            const { payment_address_range } = wallet;
            const { start: payment_start, end: payment_end } = payment_address_range;

            let index_of_address = 0;

            // Loop through payment addresses in the range
            for (let payment_address_index = payment_start; payment_address_index <= payment_end; payment_address_index++, index_of_address++) {
                const wallet_payment_account_address_keys = new WalletPaymentAccountAddressKeys(wallet_payment_and_staking_account_keys.paymentChainPrivateKey, payment_address_index);
                // We need to get generate the address from the base address, as cardano wasm we are using (non browser version) doesn't expose some things we need
                var source_payment_address = derivePaymentAddressFromKeys(wallet_name, wallet.payment_address_type, wallet_payment_account_address_keys.paymentPublicAddressRawKey, wallet_staking_account_address_keys.stakingPublicAddressRawKey);
                const source_payment_public_address_raw_key_hex = wallet_payment_account_address_keys.paymentPublicAddressRawKeyHex;
                const source_payment_private_key_hex = wallet_payment_account_address_keys.paymentPrivateAddressKeyHex
                
                // Payment addresses is optional
                if(wallet.payment_addresses) {
                    const provided_source_payment_address = wallet.payment_addresses[index_of_address];

                    if(provided_source_payment_address !== source_payment_address)
                        throw new Error(`Derived payment address ${source_payment_address} did not match provided address ${provided_source_payment_address} for address index ${payment_address_index}`);
                }

                let source_payment_address_hex;
                try {
                    // Get destination address hex required for signature (and verify against public account key where possible)
                    source_payment_address_hex = getAddressInHexAndVerify(source_payment_address, wallet.payment_address_type, source_payment_public_address_raw_key_hex);
                }
                catch(error) {
                    throw new Error(`Failed to convert/verify source payment address ${source_payment_address}: ${error.message}`);
                }
                
                // Get or create source address donation state
                if (!(source_payment_address in donation_state_entries)) {
                    donation_state_entries[source_payment_address] = {
                        wallet: wallet_name,
                        last_donation_state: 'inactive',
                        dest_addr: '',
                        dest_addr_index: payment_address_index,
                        last_info_message: ''
                    };
                }
                // Update wallet name, also as last version didn't have this so we make sure we add it (also if user changes name in future and reruns)
                // Same for payment_address_index
                donation_state_entries[source_payment_address].wallet = wallet_name;
                donation_state_entries[source_payment_address].dest_addr_index = payment_address_index;
                const last_donation_state = donation_state_entries[source_payment_address].last_donation_state;

                // Only send donations for those that need it or if we requested a basic check (though check donation doesn't unfortunately check the entire assigment)
                if(force_donations || last_donation_state !== 'active' || last_donation_state === 'check_donate') {
                    let final_destination_payment_address
                    if(config.mode.operation === 'donate') {                    
                        console.log(`Generating Donate_to from ${source_payment_address}`);
                        final_destination_payment_address = destination_payment_address;
                    } else if(config.mode.operation === 'check_donate') {
                        // Set nonsense paymnent address
                        // This would either return original address not valid or that the address is bad
                        // Either way we check out own addresses this way without applying a real donation
                        console.log(`Checking Donate_to from ${source_payment_address}`);
                        final_destination_payment_address = 'addrinvalid';
                    }

                    const data_to_sign = `Assign accumulated Scavenger rights to: ${final_destination_payment_address}`;

                    const signature = signDonation(wallet_name, source_payment_address_hex, source_payment_private_key_hex, data_to_sign);
                    // Shouldn't really pass the donation_state_entries to sendDonation but need something working quickly
                    const result = await sendDonation(wallet_name, config, source_payment_address, final_destination_payment_address, signature, donation_state_entries);

                    await sleep(config.api.sleep_between_calls_ms); // throttle the calls to the server as needed
                }

                // Check cancel
                signal.throwIfAborted();    
            }
        }
    }
}

// function to run the program
export async function startApp(donations_state_path, json_donation_data, { signal } = {}) {
    // ********************************************************
    // Load configuration from YAML file
    // ********************************************************

    // If no json donation data, let's initalise it
    if(!json_donation_data || !donations_state_path)
        throw new Error(`Please provde a valid json donation path and data object to startApp.`);

    // Load config from YAML file
    const config_path = path.join(__dirname, 'app.yaml');
    const content = fs.readFileSync(config_path, 'utf8');
    const yaml_content = yaml.load(content);

    if (!yaml_content) {
        throw new Error('Configuration app.yaml is empty');
    }

    const config = new Config(yaml_content);

    // ********************************************************
    // Load state data from JSON
    // ********************************************************

    // Load donation state data from json file
    // Check if the file exists
    if (fs.existsSync(donations_state_path)) {
        try {
            console.log(donations_state_path);
            // Synchronously read the file content
            const donations_json_content = fs.readFileSync(donations_state_path, 'utf8');

            // Parse the JSON content
            if(donations_json_content)
                Object.assign(json_donation_data, JSON.parse(donations_json_content)); // Parse the JSON data
        } catch (error) {
            throw new Error(`Unable to parse donatations state file at ${donations_state_path}`);
        }
    } else {
        console.warn('There is no donations state data yet to load. It will be initialised.');
    }

    // Example: Filter data where 'last_donation_state' is "active"
    //donation_state_entries = Object.entries(json_donation_data);

    if (config.mode.test_only) {
        console.log("*********************************************************")
        console.log("THIS IS A TEST RUN ONLY. NOTHING WILL BE SENT VIA API !!!")
        console.log("*********************************************************")
    }

    //console.log(json_donation_data);

    // run donations
    await processDonations(config, json_donation_data, { signal });
}

// AppRunner so we can handle control-c and make sure we capture donations state on exit correctly
class AppRunner {
    #abortController = new AbortController();
    #donations_state_path = path.join(__dirname, 'donations.json');
    #json_donation_data = {};

    constructor() {
        process.on('SIGINT', async () => {
            console.log(" Ctrl+C handling started...");
            this.#abortController.abort();  // request cancel of running process
            await this.closeApp();
            process.exit(0); // ensures app stops
        });
    }

    async run() {
        try {
            await startApp(
                this.#donations_state_path, 
                this.#json_donation_data,
                { signal: this.#abortController.signal } );
        }
        catch(error) {
            console.log(`App failed with error: ${error.message}`);
        } 
        finally {
            await this.closeApp();
        }
    }

    jsonDataIsEmpty() {
        if(this.#json_donation_data) {
            for (const key in this.#json_donation_data) {
                if (Object.hasOwn(this.#json_donation_data, key))
                    return false;
            }
        }
        return true;
    }

    async closeApp() {
        //console.log(`Data: ${JSON.stringify(this.#json_donation_data, null, 2)}`);
        // Only write out if we have the data
        if(!this.jsonDataIsEmpty()) {
            console.warn(`Writing updated donation state even on app failure (don't interupt process!)`);
            // Convert the updated data back to a JSON string
            const donations_json_content = JSON.stringify(this.#json_donation_data, null, 2);
            // Write the updated data back to the file, overwriting the original file
            fs.writeFileSync(this.#donations_state_path, donations_json_content, 'utf8');
            console.log(`App completed`);
        }
    }
}

// *****************************************************************
// Handle running of file (when executed as script, not imported )
// *****************************************************************

const currentFile = fileURLToPath(import.meta.url);
const executedFile = resolve(process.argv[1]);

// Ensure the executed file includes .js if needed
const executedFileWithExt = extname(executedFile) ? executedFile : executedFile + '.js';

if (currentFile === executedFileWithExt) {
  const app = new AppRunner().run().catch((err) => {
    console.error("Failed to close app cleanly (state maybe affected): ", err);
    process.exit(1);
  });
}