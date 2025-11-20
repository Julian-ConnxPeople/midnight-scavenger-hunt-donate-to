# midnight-scavenger-hunt-donate-to

Allows to consolidate Night token claims to a different registered wallet (also good learning about key derivation)

NOTE: All standard Shelley era wallets and addresses are supported inlcluding Enterprise addresses (those that exclude staking).
It works with things like Lace, Vespr and Enterprise address miners like Shadow-Harvester.

This project also gives good insight into how Cardano private/public keys are derived

## Execution

* Change app.yaml to your requirements (see file) 
* Run in node.js using: node app

## Linux Environment

* NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

* Node.js
nvm install node
nvm use 25.2.0

## Dependencies

* Node Js Command Line Argument Parsing
npm install minimist

* Cardano Serialization Lib (Emurgo lib)
npm install @emurgo/cardano-serialization-lib-nodejs

* CBOR (Concise Binary Object Representation) 
npm install cbor

* Bech32 (Human Readable Error Detecting Format)
npm install bech32

* BLAKE2b (hashing lib)
npm install blakejs

* Base64url (URL Safe Base64 encoding) 
npm install base64url

* Fast Hash
npm install fnv32

* Bitcoin Improvement Proposal 39
npm install bip39

* Java Script Object Notation for Linked Objects
npm install jsonld

* CRC (Cyclic Redundancy Check)
npm install crc

* Elliptic Curve Cryprography
npm install secp256k1

* Cardano Wallet (6 Packages are looking for funding - LOL :o) 
npm install cardano-wallet

* Cardano Signer (Open Source SPO Project from ATADA_Stakepool)
Download the project using git
Use version 1.32.0 
https://github.com/gitmachtl/cardano-signer/

* Axios (as not running in browser environment just standalone Node.js, also fetch didn't work well)
npm install axios

* Js-Yaml (Yaml file/content handling)
npm install js-yaml

* Might be something else if forgot to list but you will find out

## Notes

The software needs to sign using CIP-8 (as are not a DAPP) for the Donate to API
We used the cardano signer project
Probably can rework this now i know more, but this works fine

To do this, we just needed to modify the cardano-signer.js to export the CIP8 and other related functions (only few lines at end of file)
Otherwise it runs as a program, but we want to use it as library.

YOU NEED TO MAKE THE SAME CHANGES IN THE cardano-signer.js FILE AS I DID (if not version 1.32.0) OR REPLACE IT WITH MY VERSION DIRECTLY

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.








