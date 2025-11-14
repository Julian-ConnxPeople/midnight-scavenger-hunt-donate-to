// Importing from local files
import { readAddr2hex, getHash, signCIP8, verifyCIP8 } from './cardano-signer/src/cardano-signer.js';

// Importing from third-party packages
import CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import bip39 from 'bip39';
import axios from 'axios';

console.log("Running Midnight Scavenger Hunt Donate To Script");
console.log();

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

// Do test run without sending actual api calls (you need to change this to actually send the registration!)
var test_run = true;

if(test_run) {
    console.log("****************************************************")
    console.log("THIS IS A TEST RUN. NOTHING WILL BE SENT VIA API !!!")
    console.log("****************************************************")
    console.log()
}

// ********************************************************
// Constants
// ********************************************************

const WalletType = {
    CardanoMultiAccountShelleyWallet: 'CardanoMultiAccountShelleyWallet', // Lace compatible
}

// Define an enumeration for address types
const AddressType = {
    ByronBase58: 'ByronBase58', // Byron is not tested only fully tested with Shelley Bech32 formats!!
    ShelleyBech32: 'ShelleyBech32',
};

// Define an enumeration for address types
const DestinationPublicKeyAddressType = {
    PublicAccountExtendeBech32Xpub: "PublicAccountExtendeBech32Xpub", // Like xpub1 (used by Vespr for example)
    PublicAccountExtendedHex: "PublicAccountExtendedHex", // Like f3a... (Used by Lace for example)
};

// ********************************************************
// Set url to use for posting complete donate_to calls
// ********************************************************

const systemUrl = 'https://scavenger.prod.gd.midnighttge.io'

// ********************************************************
// Set source wallet info (Original Claim)
// ********************************************************

const source_wallet_type = WalletType.CardanoMultiAccountShelleyWallet;
// Note the code also verifies the words are bip39 (DONT LET ANYONE SEE THIS AND ONLY DO THIS IN A WELL PROTECTED ENVIRONMENT)
const source_mnemonic = 'SET ME TO YOUR 24 WORDS OR EQUIVALENT PLEASE ONLY BIP39 WORDS';
const source_address = 'addr1.....';
// You don't normally need to change the source info below but you can if needed
const source_address_account_number = 0; // The account number for a multi account wallet like lace or vespr
const source_address_account_index = 0; // 0 is the first address, wallets normally use this but address could be another one

// ********************************************************
// Set destination address info (When you want to send)
// ********************************************************

const destination_address_type = AddressType.ShelleyBech32;
const destination_address = 'addr1......';
// Set optional destination public key to verify (good idea!!) or leave empty if you really want to take the risk and just send it to that!
// Please check the format of your wallet account's public key (see DestinationPublicKeyAddressType list above for clues)
// Vespr uses type PublicAccountExtendedBech32XPub (xpub....)
// Lace uses type PublicAccountExtendedHex (just normal hex)
const destination_public_key_to_verify = 'xpub1.....';
const destination_public_key_type = DestinationPublicKeyAddressType.PublicAccountExtendedBech32XPub;
// If you have set destination_public_key_to_verify, please also provide the account number and index that belongs to that address
// This is normally 0 (other indexes are also yours so no a major issue)
// Unfortunately the underlying method used for public key verification requires this, it doesn't check at account level only
// Normally 0 for most wallets like vespr, but you might need to change if for odd cases, i.e. you are using multiple addresses from the same account
// and you want to send to another
const destination_address_account_number = 0; // The account number for a multi account wallet like lace or vespr
const destination_address_account_index = 0; // 0 is the first address, wallets normally use this but address could be another one

// ********************************************************
// Set Wallet Config Details
// ********************************************************

var source_address_type
switch (source_wallet_type) {
    case WalletType.CardanoMultiAccountShelleyWallet:
        source_address_type = AddressType.ShelleyBech32;
        var source_mnemonic_is_bip39 = true;        	
        var source_passphrase = ''; // Lace doesn't set a true bip39 passphrase. Wallet password is different and not this!!
        break;
    default:
        console.error(`Error: Unsupported wallet type: ${source_wallet_type}`);
        process.exit(1); // Exit with error code 1
}

// ********************************************************
// Functions we want to utilise
// ********************************************************

// Function to process the address based on its type - address_public_key_hex is optional and just checks it against the address
function getAddressInHex(address, addressType, address_public_key_hex) {
    switch (addressType) {
        case AddressType.ByronBase58:
            base58_address_hex = CardanoWasm.ByronAddress.from_base58(address).to_hex();
	    return bech32_address_hex;
        case AddressType.ShelleyBech32:
            var address_obj = readAddr2hex(address, address_public_key_hex);
            //var address_obj = readAddr2hex(address);
            //console.log(address_obj.type);
            if (address_public_key_hex && !address_obj.matchPubKey) {
                throw new Error(`Public key from the Private Key doesn't match with the address: ${address}`); // Propogate public key mismatch error
	    }
            return address_obj.hex;
        default:
            throw new Error(`Error: Invalid address type: ${addressType} for ${address}`);
    }
}

// Make sure we have a clean and validated mnemonic phrase 
function canonizeMnemonic(mnemonic, is_bip39 = true){
    mnemonic = mnemonic.trim();
    mnemonic = mnemonic.replace(/[\r\n]+/g, "");          // remove all new line charachters
    mnemonic = mnemonic.replace(/[ ]{2,}/gi," ");         // reduce 2 or more space between words to 1
    mnemonic = mnemonic.toLowerCase();

    if(is_bip39) {
        const isValidMnemonic = bip39.validateMnemonic(mnemonic);

        if(!isValidMnemonic) {
            console.error(`Error: Your mnemonmic phrase was not a valid bip39 phrase from the fixed work list`);
            process.exit(1);
        }
    }

    return mnemonic;
}

// ********************************************************
// Canonize (clean) variables
// ********************************************************

// TODO
// * Address format validations per supported type, to make sure type matches what is provided
// * Canonized cleanup of other variables, some done but not all

var canonized_source_passphrase = source_passphrase;
var canonized_source_address = source_address;
var canonized_destination_address = destination_address;
var canonized_source_mnemonic = canonizeMnemonic(source_mnemonic, source_mnemonic_is_bip39);
var canonized_data = `Assign accumulated Scavenger rights to: ${canonized_destination_address}`;

/*if (canonized_source_address === canonized_destination_address) {
    console.log();
    console.error(`Error: Do not set your destination address to the same as the source (claim) address. It must be different.`);
    process.exit(1);
}*/

//console.log(`canonized_source_address: ${canonized_source_address}`);
//console.log(`canonized_destination_address: ${canonized_destination_address}`);
//console.log();

// ********************************************************
// Set Data
// ********************************************************

var canonized_data = `Assign accumulated Scavenger rights to: ${canonized_destination_address}`;
//console.log(`canonized_data: ${canonized_data}`);
//console.log();

// *********************
// DERIVE SOURCE KEYS (More keys that we need but this was for my own understanding)
// *********************

try {
    // Handle here (for now) only standard bip39 (fixed word list) icarus/shelley wallets
    // Generate a ed25519e key from the provided entropy(mnemonics)
    const source_entropy_hex = bip39.mnemonicToEntropy(canonized_source_mnemonic);
    const source_root_private_key = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(Buffer.from(source_entropy_hex, 'hex'), Buffer.from(canonized_source_passphrase));
    const source_root_private_raw_key = source_root_private_key.to_raw_key();
    const source_root_private_raw_key_hex = source_root_private_raw_key.to_hex();

    const source_root_public_key = source_root_private_key.to_public();
    const source_root_public_key_hex = source_root_public_key.to_hex();

    //generate the public key from the secret key for external verification
    const source_root_public_raw_key = source_root_private_raw_key.to_public(); // public here already raw as from private raw
    const source_root_public_raw_key_hex = source_root_public_raw_key.to_hex();

    // derive account key: m / 1852' / 1815' / 0' (account number)
    // where ' means hardened derivation
    const source_root_private_account_key = source_root_private_key
        .derive(1852 | 0x80000000)
        .derive(1815 | 0x80000000)
        .derive(source_address_account_number | 0x80000000);

    // This (0) is the external chain used for payment addresses (1 is internal)
    var account_chain = 0;

    const source_root_public_account_key = source_root_private_account_key.to_public();
    var source_root_public_account_key_hex = source_root_public_account_key.to_hex();

    // derive payment key: m / 1852' / 1815' / 0' (account number) / 0 (chain) 
    const source_chain_private_key = source_root_private_account_key.derive(account_chain);
    var source_chain_private_key_hex = source_chain_private_key.to_hex();

    // derive payment key: m / 1852' / 1815' / 0' (account number) / 0 (chain) / 0 (account index)
    const source_payment_private_key = source_chain_private_key.derive(source_address_account_index);
    var source_payment_private_key_hex = source_payment_private_key.to_hex();

    // convert to raw Ed25519 private key (32 bytes)
    const source_payment_private_raw_key = source_payment_private_key.to_raw_key();
    var source_payment_private_raw_key_hex = source_payment_private_raw_key.to_hex();

    const source_chain_public_key = source_chain_private_key.to_public();
    var source_chain_public_key_hex = source_chain_public_key.to_hex();
    var bech_3 = source_chain_public_key.to_bech32();

    const source_payment_public_key = source_payment_private_key.to_public();
    var source_payment_public_key_hex = source_payment_public_key.to_hex();

    const source_payment_public_raw_key = source_payment_public_key.to_raw_key();
    var source_payment_public_raw_key_hex = source_payment_public_raw_key.to_hex();
} catch (error) {
    console.log();
    console.error(`Error: Failed to derive source private and public keys - '${error.message}'`);
    process.exit(1);
}

// ****************************************
// DERIVE DESTINATION PUBLIC KEYS FOR VALIDATION (that we send to somewhere we trust)
// ****************************************

// Note, this is for extra verification of destination only so we don't make a type
// It is not strictly needed, but knowing it matches the intended public key we have complete confidence

if (destination_public_key_to_verify) {
    try {
        let destination_root_public_account_key
        switch (destination_public_key_type) {
            case DestinationPublicKeyAddressType.PublicAccountExtendedBech32XPub:
                if (!destination_public_key_to_verify.startsWith('xpub')) {
                    console.error(`The destination public account key does not start with xpub: ${destination_public_key_to_verify}`);
                    process.exit(1); // Exit with error code 1
                }
                destination_root_public_account_key = CardanoWasm.Bip32PublicKey.from_bech32(destination_public_key_to_verify);
                break;
            case DestinationPublicKeyAddressType.PublicAccountExtendedHex:
                destination_root_public_account_key = CardanoWasm.Bip32PublicKey.from_hex(destination_public_key_to_verify);
                break;
            default:
                console.error(`Error: Unsupported destination public key type: ${destination_public_key_type}`);
                process.exit(1); // Exit with error code 1
        }

        // Note, the method we imported only validates on the payment key, not account key. So we need to derive the payment public key from it
        const destination_payment_public_key = destination_root_public_account_key.derive(account_chain).derive(destination_address_account_index);
        var destination_payment_public_raw_key_hex = destination_payment_public_key.to_raw_key().to_hex();
    } catch (error) {
        console.log();
        console.error(`Error: Failed to derive destination public keys - '${error.message}'`);
        process.exit(1);
    }
}

// ****************************************
// LOG RELEVANT PUBLIC KEYS (for debugging where needed)
// ****************************************

//console.log(`source_root_public_raw_key_hex: ${source_root_public_raw_key_hex}`);
//console.log(`source_root_public_account_key_hex: ${source_root_public_account_key_hex}`);
//console.log(`source_chain_public_key_hex: ${source_chain_public_key_hex}`);
//console.log(`source_payment_public_key_hex: ${source_payment_public_key_hex}`);
//console.log(`source_payment_public_raw_key_hex: ${source_payment_public_raw_key_hex}`);
//console.log();

// ********************************************************
// Convert addresses to hex representation and verify (at least in bech32 cases for now)
// ********************************************************

// Verification only happens for bech32 addresses (not legacy ones) keys right now
// This adds at least some level of protection if we are paying ourselves and want to know its us
// You can turn destination address verification off by just setting destination_public_key_to_verify to empty
// Source verification you cannot turn off!

try {
    var source_address_hex = getAddressInHex(canonized_source_address, source_address_type, source_payment_public_raw_key_hex);
} catch (error) {
    console.error(`Error: Source Address - '${error.message}'`); process.exit(1);
}

try {
    var destination_address_hex = getAddressInHex(
        canonized_destination_address,
        destination_address_type,
        (destination_payment_public_raw_key_hex && destination_payment_public_raw_key_hex !== "") ? destination_payment_public_raw_key_hex : undefined
    );
} catch (error) {
    console.error(`Error: Destination Address - '${error.message}'`); process.exit(1);
}

// ********************************************************
// Create CIP8/30 Signature
// ********************************************************

console.log(`Generating Donate_to from ${canonized_source_address}`);
console.log();
console.log(`Data is '${canonized_data}'`);
console.log();

const data_hex = Buffer.from(canonized_data, 'utf8').toString('hex');

try {
    var ret = signCIP8('sign-cip8',
        [ '--cip8',
        '--data-hex', data_hex,
        '--secret-key', source_payment_private_key_hex,
        '--address', source_address_hex ]
    );
    var signature = ret.cose_sign1_cbor_hex;
} catch (error) {
    console.error(`Error: CIP-8 signing error - ${error.msg}`);
    process.exit(1);
}

// Show our signature
//const bufferThis = Buffer.from(signature, 'hex');
//console.log(bufferThis.toString('utf8'));  // Convert the hex data to a string (UTF-8)

// Show the example signature from docs for comparison
// We checked how the example from the API docs were encoded so we can do the same
/*const hexString = "845882a3012704583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70da6761646472657373583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70daa166686173686564f4589441737369676e20616363756d756c617465642053636176656e6765722072696768747320746f3a20616464725f7465737431717134646c336e6872306178757267637270756e39787970303470643272326477753578376565616d3938707376366468786c6465387563636c7632703436686d303737647334767a656c66353536356667336b79373934756872713575703068655840514b869f06b1d86b61781291bef81753b118cf9f11a13ee4824ff151cda4529c1580ab465c1aae5153bc18d94de71978221e6d714dd2329634e5733946c39103";

const buffer = Buffer.from(hexString, 'hex');
console.log(buffer.toString('utf8'));  // Convert the hex data to a string (UTF-8)
console.log()
*/

// ********************************************************
// Send the message/s to the API and record the results
// ********************************************************

// Construct the URL (this is equivalent to your curl URL with parameters in the path)
var finalUrl = `${systemUrl}/donate_to/${canonized_destination_address}/${canonized_source_address}/${signature}`;

// Print the URL to check
console.log(`API Post for sending is (test_run = ${test_run})`);
console.log(`${finalUrl}`);
console.log();

if(!test_run) {

    console.log(`Attempting to sent data to url for real ...`);    
    console.log();

    // Parameters are:
    //   destinationAddress: example - 'addr1qq4dl3nhr0axurgcrpun9xyp04pd2r2dwu5x7eeam98psv6dhxlde8ucclv2p46hm077ds4vzelf'
    //   originalAddress: example - 'addr1qrv3cp0m9u7y0elmk0r9wa6an5vfm24ydp5rla'
    //   signature: example - '2a3012704583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70da67616...'

    // Example:
    /*curl -L -X POST https://scavenger.prod.gd.midnighttge.io/donate_to/addr1qq4dl3nhr0axurgcrpun9xyp04pd2r2dwu5x7eeam98psv6dhxlde8ucclv2p46hm077ds4vzelf5565fg3ky794uhrq5up0he/addr1qrv3cp0m9u7y0elmk0r9wa6an5vfm24ydp5rlau99jxwvaxvj8fgfutr2sevrpsnkx2t6xgqmvdlz8jth8a5phq2wrdqklv2tz/845882a3012704583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70da6761646472657373583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70daa166686173686564f4589441737369676e20616363756d756c617465642053636176656e6765722072696768747320746f3a20616464725f7465737431717134646c336e6872306178757267637270756e39787970303470643272326477753578376565616d3938707376366468786c6465387563636c7632703436686d303737647334767a656c66353536356667336b79373934756872713575703068655840514b869f06b1d86b6178291bef81753b118cf9f11a13ee4824ff151cda4529c1580ab465c1aae5153bc18d94de71978221e6d714dd2329634e5733946c39103 -d "{}"*/

    // This function is not used but gives a good reference for the typical codes
    // Function to get the description of the status code
    function getStatusDescription(statusCode) {
        const statusMessages = {
            200: 'OK - The request was successful.',
            201: 'Created - The resource was successfully created.',
            204: 'No Content - The request was successful, but there is no content.',
            400: 'Bad Request - The request could not be understood or was missing required parameters.',
            401: 'Unauthorized - Authentication is required.',
            403: 'Forbidden - The server understood the request but refuses to authorize it.',
            404: 'Not Found - The requested resource could not be found.',
            500: 'Internal Server Error - A generic error occurred on the server.',
            502: 'Bad Gateway - The server received an invalid response from an upstream server.',
            503: 'Service Unavailable - The server is currently unavailable (overloaded or down).',
            504: 'Gateway Timeout - The server did not respond in time.',
        };

        // Return a default message if the status code is not in our list
        return statusMessages[statusCode] || `Unexpected Status: ${statusCode}`;
    }

    // Check unregistered failure with the dummy data from the docs
    //finalUrl = "https://scavenger.prod.gd.midnighttge.io/donate_to/addr1qq4dl3nhr0axurgcrpun9xyp04pd2r2dwu5x7eeam98psv6dhxlde8ucclv2p46hm077ds4vzelf5565fg3ky794uhrq5up0he/addr1qrv3cp0m9u7y0elmk0r9wa6an5vfm24ydp5rlau99jxwvaxvj8fgfutr2sevrpsnkx2t6xgqmvdlz8jth8a5phq2wrdqklv2tz/845882a3012704583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70da6761646472657373583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70daa166686173686564f4589441737369676e20616363756d756c617465642053636176656e6765722072696768747320746f3a20616464725f7465737431717134646c336e6872306178757267637270756e39787970303470643272326477753578376565616d3938707376366468786c6465387563636c7632703436686d303737647334767a656c66353536356667336b79373934756872713575703068655840514b869f06b1d86b6178291bef81753b118cf9f11a13ee4824ff151cda4529c1580ab465c1aae5153bc18d94de71978221e6d714dd2329634e5733946c39103";

    // Check post is working
    //finalUrl = "https://httpbin.org/post";

    // Set web method options
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',  // Mimic curl's default
            //'User-Agent': 'curl/8.5.0 (x86_64-pc-linux-gnu) libcurl/7.64.1 OpenSSL/1.1.1d zlib/1.2.11',
            //'Accept': '*/*',
	},
    };

    // Post using Axios as default fetch had problems with the url
    axios.post(finalUrl, null, options).then(
        response => {
            // Print status code and a human-readable description
            console.log(`HTTP Response Status: ${response.status} - ${getStatusDescription(response.status)}`);
    
            // Check if response is successful
            if (!response.ok) {  // If response status is not 2xx
                throw new Error(`Bad response was ${response.status} ${response.statusText}`);
        }

        // Parse and return the JSON data if the request was successful
        return response.json();
    })
    .then(response => {
        // Print status code and a human-readable description
        console.log(`HTTP Response Status: ${response.status} - ${response.statusText}`);

        // Axios automatically parses the response to JSON
        const data = response.data;

        // Log the data from the server
        console.log("Response Data:", data);
    })
    .catch(error => {
        // Handle errors from axios (including non-2xx responses)
        if (error.response) {
            // Server responded with a status code outside the 2xx range
            console.error(`Error occurred: ${error.response.status} ${error.response.statusText}`);
            console.error("Response Data:", error.response.data);
        } else if (error.request) {
            // Request was made, but no response was received
            console.error("No response received:", error.request);
        } else {
            // Something else triggered the error
            console.error("Error setting up request:", error.message);
        }
    });
}

