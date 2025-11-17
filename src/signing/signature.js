import { signCIP8 } from './../../cardano-signer/src/cardano-signer.js';

export function signDonation(wallet_name, source_payment_address_hex, source_payment_private_key_hex, data_to_sign) {
    let signature
    try {
        // ********************************************************
        // Create CIP8/30 Signature
        // ********************************************************

        //console.log(`Data is '${data_to_sign}'`);
        //console.log();

        const data_hex = Buffer.from(data_to_sign, 'utf8').toString('hex');

        var ret = signCIP8('sign-cip8',
            [ '--cip8',
            '--data-hex', data_hex,
            '--secret-key', source_payment_private_key_hex,
            '--address', source_payment_address_hex ]
        );
        signature = ret.cose_sign1_cbor_hex;
    } catch (error) {
        throw new Error(`CIP-8 signing error for wallet ${wallet_name} - ${error.message}`)
    }

    // Show our signature
    //const bufferThis = Buffer.from(signature, 'hex');
    //console.log(bufferThis.toString('utf8'));  // Convert the hex data to a string (UTF-8)

    return signature;
}