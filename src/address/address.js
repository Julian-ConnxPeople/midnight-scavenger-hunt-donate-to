import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { readAddr2hex } from './../../cardano-signer/src/cardano-signer.js';

// Define an enumeration for address types
export const AddressType = {
    ByronBase58: 'ByronBase58', // Byron is not tested only fully tested with Shelley Bech32 formats!!
    ShelleyBech32: 'ShelleyBech32',
};

// Define an enumeration for address types
export const PublicKeyAddressType = {
    PublicAccountExtendedBech32XPub: "PublicAccountExtendedBech32XPub", // Like xpub1 (used by Vespr for example)
    PublicAccountExtendedHex: "PublicAccountExtendedHex", // Like f3a... (Used by Lace for example)
};

// Function to process the address based on its type - address_public_key_hex is optional and just checks it against the address
export function getAddressInHexAndVerify(address, address_type, address_public_key_hex) {
    switch (address_type) {
        case AddressType.ByronBase58:
            base58_address_hex = CardanoWasm.ByronAddress.from_base58(address).to_hex();
        return bech32_address_hex;
        case AddressType.ShelleyBech32:
            var address_obj = readAddr2hex(address, address_public_key_hex);
            //console.log(address_obj.type);
            if (address_public_key_hex && !address_obj.matchPubKey) {
                throw new Error(`Public key from the Private Key doesn't match with the address: ${address}`); // Propogate public key mismatch error
        }
            return address_obj.hex;
        default:
            throw new Error(`Error: Invalid address type: ${address_type} for ${address}`);
    }
}