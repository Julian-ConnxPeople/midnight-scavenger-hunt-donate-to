import { readAddr2hex } from './cardano-signer/src/cardano-signer.js';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';

// Function to process the address based on its type - address_public_key_hex is optional and just checks it against the address
export function getAddressInHexAndVerify(address, address_type, address_public_key_hex) {
    let verify_public_key = false;
    try {
        switch (address_type) {
            case AddressType.ByronBase58:
                base58_address_hex = CardanoWasm.ByronAddress.from_base58(address).to_hex();
            return bech32_address_hex;
            case AddressType.ShelleyBech32:
                if (address_public_key_hex)
                    verify_public_key = true;
                var address_obj = readAddr2hex(address, address_public_key_hex);
                //console.log(address_obj.type);
                if (verify_public_key && !address_obj.matchPubKey)
                    throw new Error(`Public key from the Private Key doesn't match with the address: ${address}`); // Propogate public key mismatch error
                return address_obj.hex;
            default:
                throw new Error(`Error: Invalid address type: ${address_type} for ${address}`);
        }
    } catch (error) {
        throw new Error(`Unable to get and validate address: ${address}. Validate with public key [${verify_public_key}]. Msg: ${error.message}`);
    }
}