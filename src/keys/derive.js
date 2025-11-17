//import CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import {
  Address,
  BaseAddress,
  EnterpriseAddress,
  Credential,
  Ed25519KeyHash,
  Bip32PrivateKey,
  Bip32PublicKey,
  NetworkInfo
} from '@emurgo/cardano-serialization-lib-nodejs';
import bip39 from 'bip39';
import { AddressType, PublicKeyAddressType } from './../address/address.js';

// Use multiple classes from the same namespace
//const Address = CardanoWasm.Address;
//const BaseAddress = CardanoWasm.BaseAddress;
//const Bip32PrivateKey = CardanoWasm.Bip32PrivateKey;
//const Bip32PublicKey = CardanoWasm.Bip32PublicKey;
//const NetworkInfo = CardanoWasm.NetworkInfo;

export class WalletKeys {
    // Declare private fields inside the class
    #root_private_key;
    #root_private_key_hex;
    #root_private_raw_key;
    #root_private_raw_key_hex;
    #root_private_coin_type_key;
    #root_private_coin_type_key_hex;

    #root_public_key;
    #root_public_key_hex;
    #root_public_raw_key;
    #root_public_raw_key_hex;

    // Note the normal keys are the full extended keys, raw keys are the shorter form (Ed25519 keys)

    constructor(private_key) {
        if(private_key instanceof Bip32PrivateKey) {
            try {
                this.#root_private_key = private_key;
                this.#root_private_key_hex = this.#root_private_key.to_hex()
                this.#root_private_raw_key = this.#root_private_key.to_raw_key();
                this.#root_private_raw_key_hex = this.#root_private_raw_key.to_hex();
                // Always cardano coin of course
                this.#root_private_coin_type_key = this.#root_private_key
                    .derive(1852 | 0x80000000)  // ' hardened (hd wallet purpose)
                    .derive(1815 | 0x80000000); // ' hardened (cardano coin type)
                this.#root_private_coin_type_key_hex = this.#root_private_coin_type_key.to_hex();

                this.#root_public_key = this.#root_private_key.to_public();
                this.#root_public_key_hex = this.#root_public_key.to_hex();
                this.#root_public_raw_key = this.#root_private_raw_key.to_public(); // public here already raw as from private raw
                this.#root_public_raw_key_hex = this.#root_public_raw_key.to_hex();
            }
            catch (error) {
                throw new Error(`Unable to derive private/public keys from provided private key object information - '${error.message}'`);
            }
        }
        else {
            throw new Error(`Invalid type for private_key, only Bip32PrivateKey is supported currently`);
        }

        // Freeze the object to make all properties immutable
        Object.freeze(this);
    }

    // 🔹 Getters for all properties
    get rootPrivateKey() { return this.#root_private_key; }
    get rootPrivateKeyHex() { return this.#root_private_key_hex; }

    get rootPrivateRawKey() { return this.#root_private_raw_key; }
    get rootPrivateRawKeyHex() { return this.#root_private_raw_key_hex; }
    get rootPublicKey() { return this.#root_public_key; }
    get rootPublicKeyHex() { return this.#root_public_key_hex; }

    get rootPublicRawKey() { return this.#root_public_raw_key; }
    get rootPublicRawKeyHex() { return this.#root_public_raw_key_hex; }

    get rootPrivateCoinTypeKey() { return this.#root_private_coin_type_key; }
    get rootPrivateCoinTypeKeyHex() { return this.#root_private_coin_type_key_hex; }
}

export class WalletPaymentAndStakingAccountKeys {
    // external chain for payment addresses (1 is internal)
    #payment_account_chain = 0;
    #staking_account_chain = 2;

    #private_account_key;
    #private_account_key_hex;

    #payment_chain_private_key;
    #payment_chain_private_key_hex;

    #payment_public_account_key;
    #payment_public_account_key_hex;
    #payment_chain_public_key;
    #payment_chain_public_key_hex;

    #staking_chain_private_key;
    #staking_chain_private_key_hex;
    #staking_chain_public_key;
    #staking_chain_public_key_hex;
    
    // Note the normal keys are the full extended keys, raw keys are the shorter form (Ed25519 keys)

    constructor(wallet_name, root_private_cointype_key, account_number) {
        if(root_private_cointype_key instanceof Bip32PrivateKey) {
            try {
                this.#private_account_key = root_private_cointype_key
                    .derive(account_number | 0x80000000); // ' hardened (account number)
                this.#private_account_key_hex = this.#private_account_key.to_hex();

                this.#payment_public_account_key = this.#private_account_key.to_public();
                this.#payment_public_account_key_hex = this.#payment_public_account_key.to_hex();
                // derive payment key: m / 1852' / 1815' / [account number]' / [chain]
                this.#payment_chain_private_key = this.#private_account_key.derive(this.#payment_account_chain);
                this.#payment_chain_private_key_hex = this.#payment_chain_private_key.to_hex();

                this.#payment_chain_public_key = this.#payment_chain_private_key.to_public();
                this.#payment_chain_public_key_hex = this.#payment_chain_public_key.to_hex();

                this.#staking_chain_private_key = this.#private_account_key.derive(this.#staking_account_chain);
                this.#staking_chain_private_key_hex = this.#staking_chain_private_key.to_hex();

                this.#staking_chain_public_key = this.#staking_chain_private_key.to_public();
                this.#staking_chain_public_key_hex = this.#staking_chain_public_key.to_hex();
            }
            catch (error) {
                throw new Error(`Unable to derive private/public account keys from provided wallet private keys information - '${error.message}'`);
            }
        }
        else {
            throw new Error(`Unsupported type for root_private_cointype_key, only Bip32PrivateKey is supported currently`);
        }

        // Freeze the object to make all properties immutable
        Object.freeze(this);
    }

    // 🔹 Getters for all propertie
    get privateAccountKey() { return this.#private_account_key; }
    get privateAccountKeyHex() { return this.#private_account_key_hex; }
    get paymentPublicAccountKey() { return this.#payment_public_account_key; }
    get paymentPublicAccountKeyHex() { return this.#payment_public_account_key_hex; }
    get paymentChainPrivateKey() { return this.#payment_chain_private_key; }
    get paymentChainPrivateKeyHex() { return this.#payment_chain_private_key_hex; }
    get paymentChainPublicKey() { return this.#payment_chain_public_key; }
    get paymentChainPublicKeyHex() { return this.#payment_chain_public_key_hex; }
    get stakingChainPrivateKey() { return this.#staking_chain_private_key; }
    get stakingChainPrivateKeyHex() { return this.#staking_chain_private_key_hex; }
    get stakingChainPublicKey() { return this.#staking_chain_public_key; }
    get stakingChainPublicKeyHex() { return this.#staking_chain_public_key_hex; }
}

export class WalletPaymentAccountAddressKeys {
    // Declare private fields inside the class
    #payment_private_address_key
    #payment_private_address_key_hex;
    #payment_private_address_raw_key;
    #payment_private_address_raw_key_hex;
    #payment_public_address_key;
    #payment_public_address_key_hex;
    #payment_public_address_raw_key;
    #payment_public_address_raw_key_hex;

    // Note the normal keys are the full extended keys, raw keys are the shorter form (Ed25519 keys)

    constructor(payment_chain_private_key, address_index) {
        if(payment_chain_private_key instanceof Bip32PrivateKey) {
            try {
                // derive payment key: m / 1852' / 1815' / [account number]' / [chain] / [address index]
                this.#payment_private_address_key = payment_chain_private_key
                    .derive(address_index);
                this.#payment_private_address_key_hex = this.#payment_private_address_key.to_hex();

                // convert to raw Ed25519 private key (32 bytes)
                this.#payment_private_address_raw_key = this.#payment_private_address_key.to_raw_key();
                this.#payment_private_address_raw_key_hex = this.#payment_private_address_raw_key.to_hex();

                this.#payment_public_address_key = this.#payment_private_address_key.to_public();
                this.#payment_public_address_key_hex = this.#payment_public_address_key.to_hex();

                this.#payment_public_address_raw_key = this.#payment_public_address_key.to_raw_key();
                this.#payment_public_address_raw_key_hex = this.#payment_public_address_raw_key.to_hex();
            }
            catch (error) {
                throw new Error(`Unable to derive private/public payment account keys from provided wallet private payment chain key information - '${error.message}'`);
            }
        }
        else {
            throw new Error(`Unsupported type for payment_chain_private_key, only Bip32PrivateKey is supported currently`);
        }

        // Freeze the object to make all properties immutable
        Object.freeze(this);
    }

    // 🔹 Getters for all propertie
    get paymentPrivateAddressKey() { return this.#payment_private_address_key; }
    get paymentPrivateAddressKeyHex() { return this.#payment_private_address_key_hex; }
    get paymentPrivateAddressRawKey() { return this.#payment_private_address_raw_key; }
    get paymentPrivateAddressRawKeyHex() { return this.#payment_private_address_raw_key_hex; }
    get paymentPublicAddressKey() { return this.#payment_public_address_key; }
    get paymentPublicAddressKeyHex() { return this.#payment_public_address_key_hex; }
    get paymentPublicAddressRawKey() { return this.#payment_public_address_raw_key; }
    get paymentPublicAddressRawKeyHex() { return this.#payment_public_address_raw_key_hex; }
}

export class WalletStakingAccountAddressKeys {
    // Declare private fields inside the class
    #staking_private_address_key
    #staking_private_address_key_hex;
    #staking_private_address_raw_key;
    #staking_private_address_raw_key_hex;
    #staking_public_address_key;
    #staking_public_address_key_hex;
    #staking_public_address_raw_key;
    #staking_public_address_raw_key_hex;

    // Note the normal keys are the full extended keys, raw keys are the shorter form (Ed25519 keys)

    constructor(staking_chain_private_key, address_index) {
        if(staking_chain_private_key instanceof Bip32PrivateKey) {
            try {
                // derive staking key: m / 1852' / 1815' / [account number]' / [chain] / [address index]
                // NOTE: Staking uses address index 0 normally, others are not often used
                this.#staking_private_address_key = staking_chain_private_key
                    .derive(address_index);
                this.#staking_private_address_key_hex = this.#staking_private_address_key.to_hex();

                // convert to raw Ed25519 private key (32 bytes)
                this.#staking_private_address_raw_key = this.#staking_private_address_key.to_raw_key();
                this.#staking_private_address_raw_key_hex = this.#staking_private_address_raw_key.to_hex();

                this.#staking_public_address_key = this.#staking_private_address_key.to_public();
                this.#staking_public_address_key_hex = this.#staking_public_address_key.to_hex();

                this.#staking_public_address_raw_key = this.#staking_public_address_key.to_raw_key();
                this.#staking_public_address_raw_key_hex = this.#staking_public_address_raw_key.to_hex();
            }
            catch (error) {
                throw new Error(`Unable to derive private/public staking account keys from provided wallet private staking chain key information - '${error.message}'`);
            }
        }
        else {
            throw new Error(`Unsupported type for staking_chain_private_key, only Bip32PrivateKey is supported currently`);
        }

        // Freeze the object to make all properties immutable
        Object.freeze(this);
    }

    // 🔹 Getters for all propertie
    get stakingPrivateAddressKey() { return this.#staking_private_address_key; }
    get stakingPrivateAddressKeyHex() { return this.#staking_private_address_key_hex; }
    get stakingPrivateAddressRawKey() { return this.#staking_private_address_raw_key; }
    get stakingPrivateAddressRawKeyHex() { return this.#staking_private_address_raw_key_hex; }
    get stakingPublicAddressKey() { return this.#staking_public_address_key; }
    get stakingPublicAddressKeyHex() { return this.#staking_public_address_key_hex; }
    get stakingPublicAddressRawKey() { return this.#staking_public_address_raw_key; }
    get stakingPublicAddressRawKeyHex() { return this.#staking_public_address_raw_key_hex; }
}

export class PaymentPublicAddressKeys {
    // Declare private fields inside the class
    #payment_public_address_key;
    #payment_public_address_key_hex;
    #payment_public_address_raw_key;
    #payment_public_address_raw_key_hex;

    // Note the normal keys are the full extended keys, raw keys are the shorter form (Ed25519 keys)

    constructor(payment_public_address_key) {
        if(payment_public_address_key instanceof Bip32PublicKey) {
            try {
                this.#payment_public_address_key = payment_public_address_key;
                this.#payment_public_address_key_hex = this.#payment_public_address_key.to_hex();

                this.#payment_public_address_raw_key = this.#payment_public_address_key.to_raw_key();
                this.#payment_public_address_raw_key_hex = this.#payment_public_address_raw_key.to_hex();
            }
            catch (error) {
                throw new Error(`Unable to derive public address keys from provided payment_public_address_key - '${error.message}'`);
            }
        }
        else {
            throw new Error(`Unsupported type for payment_public_address_key, only Bip32PublicKey is supported currently`);
        }

        // Freeze the object to make all properties immutable
        Object.freeze(this);
    }

    // 🔹 Getters for all propertie
    get paymentPublicAddressKey() { return this.#payment_public_address_key; }
    get paymentPublicAddressKeyHex() { return this.#payment_public_address_key_hex; }
    get paymentPublicAddressRawKey() { return this.#payment_public_address_raw_key; }
    get paymentPublicAddressRawKeyHex() { return this.#payment_public_address_raw_key_hex; }
}

// Derive wallet keys from mnemonic and optional passphrase
export function deriveWalletKeys(wallet_name, mnemonic, passphrase = '') {
    let wallet_keys
    try {
        if (!bip39.validateMnemonic(mnemonic))
            throw new Error(`Mnemonmic phrase was not a valid bip39 phrase from the allowed word list for wallet [${wallet_name}].`);

        // Handle here (for now) only standard bip39 (fixed word list) icarus/shelley wallets
        // Generate a ed25519e key from the provided entropy(mnemonics)
        const entropy_hex = bip39.mnemonicToEntropy(mnemonic);
        const root_private_key = Bip32PrivateKey.from_bip39_entropy(Buffer.from(entropy_hex, 'hex'), Buffer.from(passphrase));

        wallet_keys = new WalletKeys(root_private_key);
    } catch (error) {
        throw new Error(`Failed to create private key object from mnemonic for wallet [${wallet_name}]- '${error.message}'`);
    }

    return wallet_keys
}

export function derivePaymentPublicAddressKeysFromPublicAccountKey(public_account_key, public_account_key_type, address_account_index) {
    let payment_public_address_keys
    try {
        // external chain for payment addresses (1 is internal)
        const account_chain = 0;

        let root_public_account_key
        switch (public_account_key_type) {
            case PublicKeyAddressType.PublicAccountExtendedBech32XPub:
                if (!public_account_key.startsWith('xpub')) {
                    throw new Error(`The destination public account key does not start with xpub: '${public_account_key}'`);
                }
                root_public_account_key = Bip32PublicKey.from_bech32(public_account_key);
                break;
            case PublicKeyAddressType.PublicAccountExtendedHex:
                root_public_account_key = Bip32PublicKey.from_hex(public_account_key);
                break;
            default:
                throw new Error(`Error: Unsupported destination public key type: '${public_account_key_type}' for key: '${public_account_key}'`)
        }

        // Note, the method we imported only validates on the payment key, not account key. So we need to derive the payment public key from it
        const payment_public_account_address_key = root_public_account_key.derive(account_chain).derive(address_account_index);

        payment_public_address_keys = new PaymentPublicAddressKeys(payment_public_account_address_key);
    } catch (error) {
        throw new Error(`Failed to derive public address key for index '${address_account_index}' from public account key: '${public_account_key}' - '${error}'`);
    }

    return payment_public_address_keys;
}

export function derivePaymentAddressFromKeys(wallet_name, address_type, payment_address_public_raw_key, staking_address_public_raw_key) {
    // Sorry, no check on adress type at this point. No time.
    // For mainnet only
    const networkId = NetworkInfo.mainnet().network_id();

    const payment_hash = payment_address_public_raw_key.hash();
    
    // Credential is new (StakeCredential was old name!)
    const payment_cred = Credential.from_keyhash(payment_hash);

    let stake_cred;
    let base_address;
    switch (address_type) {
        //case AddressType.ByronBase58:
        case AddressType.ShelleyBech32:
            const stake_hash= staking_address_public_raw_key.hash();
            stake_cred = Credential.from_keyhash(stake_hash);
            base_address = BaseAddress.new(
                networkId,
                payment_cred,
                stake_cred
            );
            break;
        case AddressType.EnterpriseShellyBech32:
            // Enterprise addresses do not have a staking part, so pass `null` for the stake credential
            base_address = EnterpriseAddress.new(
                networkId,
                payment_cred
            );
            break;
        default:
            throw new Error(`Address type is not supported: ${address_type} for ${address}`);
    }

    const payment_address = base_address.to_address().to_bech32();

    return payment_address;
}