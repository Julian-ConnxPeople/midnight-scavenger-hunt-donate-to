import axios from 'axios';

// Show the example signature from docs for comparison
// We checked how the example from the API docs were encoded so we can do the same
/*const hexString = "845882a3012704583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70da6761646472657373583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70daa166686173686564f4589441737369676e20616363756d756c617465642053636176656e6765722072696768747320746f3a20616464725f7465737431717134646c336e6872306178757267637270756e39787970303470643272326477753578376565616d3938707376366468786c6465387563636c7632703436686d303737647334767a656c66353536356667336b79373934756872713575703068655840514b869f06b1d86b61781291bef81753b118cf9f11a13ee4824ff151cda4529c1580ab465c1aae5153bc18d94de71978221e6d714dd2329634e5733946c39103";

const buffer = Buffer.from(hexString, 'hex');
console.log(buffer.toString('utf8'));  // Convert the hex data to a string (UTF-8)
console.log()
*/

function extractAddr1(str) {
  // Use RegExp constructor if slashes are causing issues
  const regex = new RegExp('addr1[^ ]*');
  const match = str.match(regex);
  return match ? match[0] : null;
}

export function sendDonation(
    wallet_name,
    config,
    source_address,
    destination_address,
    signature,
    donation_state_entries
) {
    // ********************************************************
    // Send the message/s to the API and record the results
    // ********************************************************

    const test_only = config.mode.test_only;
    const operation = config.mode.operation;
    const api_url = config.api.url;

    let success = false

    // Construct the URL (this is equivalent to your curl URL with parameters in the path)
    const finalUrl = `${api_url}/donate_to/${destination_address}/${source_address}/${signature}`;

    // Print the URL to check
    //console.log(`API Post for sending is (test_run = ${test_run})`);
    //console.log(`${finalUrl}`);
    //console.log();
    
    if(!test_only) {
        //console.log(`Attempting to sent data to url for real ...`);    
        //console.log();

        // Parameters are:
        //   destinationAddress: example - 'addr1qq4dl3nhr0axurgcrpun9xyp04pd2r2dwu5x7eeam98psv6dhxlde8ucclv2p46hm077ds4vzelf'
        //   originalAddress: example - 'addr1qrv3cp0m9u7y0elmk0r9wa6an5vfm24ydp5rla'
        //   signature: example - '2a3012704583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70da67616...'

        // Example:
        /*curl -L -X POST https://scavenger.prod.gd.midnighttge.io/donate_to/addr1qq4dl3nhr0axurgcrpun9xyp04pd2r2dwu5x7eeam98psv6dhxlde8ucclv2p46hm077ds4vzelf5565fg3ky794uhrq5up0he/addr1qrv3cp0m9u7y0elmk0r9wa6an5vfm24ydp5rlau99jxwvaxvj8fgfutr2sevrpsnkx2t6xgqmvdlz8jth8a5phq2wrdqklv2tz/845882a3012704583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70da6761646472657373583900d91c05fb2f3c47e7fbb3c657775d9d189daaa468683ff7852c8ce674cc91d284f1635432c18613b194bd1900db1bf11e4bb9fb40dc0a70daa166686173686564f4589441737369676e20616363756d756c617465642053636176656e6765722072696768747320746f3a20616464725f7465737431717134646c336e6872306178757267637270756e39787970303470643272326477753578376565616d3938707376366468786c6465387563636c7632703436686d303737647334767a656c66353536356667336b79373934756872713575703068655840514b869f06b1d86b6178291bef81753b118cf9f11a13ee4824ff151cda4529c1580ab465c1aae5153bc18d94de71978221e6d714dd2329634e5733946c39103 -d "{}"*/

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

        const source_address_state = donation_state_entries[source_address];

        // Post using Axios as default fetch had problems with the url
        axios.post(finalUrl, null, options).then(
            response => {
                // Print status code and a human-readable description
                //console.log(`HTTP Response Status: ${response.status} - ${getStatusDescription(response.status)}`);

                // Check if response is successful
                if (response.ok) {// If response status is 2xx
                    source_address_state.last_donation_state = 'active'
                    source_address_state.dest_addr = destination_address;
                    source_address_state.last_info_message = 'First time assignment successfull';

                    if(operation === 'check_donate') {
                        console.log("- STOP: This would never happen in practise as donation destination address is always a nonsense value.");
                        throw new Error(`SERIOUS:"Check donate resulted in a successfull assignement. Don't use check_donate if this ever happens (it won't)`);
                    }
                    
                    console.log("- OK");

                    success = true;
                } else {
                    // We check donate status further in error handling to see if ok or not
                    if(operation !== 'check_donate') {
                        console.log("- NOT_OK - ${response.status} ${response.statusText}");
                    }
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
            // SORRY - BIT OF A MESS - WAS TRYING TO WORK OUT HOW MUCH WE CAN FIND OUT 
            // ABOUT THE DONATION WITH CHECK_DONATE WITHOUT ACTUALLY SUBMITTING A VALID ONE
            // ALSO ADDED STATE QUICKLY IN A NASTY WAY
            if (error.response) {
                const responseMessageLowerCase = error.response.data.message.toLowerCase();
                // Server responded with a status code outside the 2xx range
                if(operation === 'check_donate') {
                    if(responseMessageLowerCase.includes('is not registered')) {
                        if(responseMessageLowerCase.includes('original')) {
                            if(responseMessageLowerCase.includes('has not accepted')) {
                                if(last_donation_state === 'active')
                                    source_address_state.last_info_message = 'Donation state was previously active, but api is saying source address has not accepted terms. Something strange.';
                                else {
                                    source_address_state.last_donation_state = 'no_source_address_registration_with_agreed_terms';
                                    source_address_state.last_info_message = 'Source address is not registered and has not signed terms';
                                }
                                console.log(`- NO_ORIGINAL_REGISTRATION_WITH_ACCEPTED_TERMS. Orig: ${source_address} - ${error.response.status}`);
                            }
                            else {
                                if(last_donation_state === 'active')
                                    source_address_state.last_info_message = 'Donation state was previously active, but api is saying source address is not registered. Something strange.';
                                else {
                                    source_address_state.last_donation_state = 'no_source_address_registration';
                                    source_address_state.last_info_message = 'Source address is not registered';
                                }
                                console.log(`- NO_ORIGINAL_REGISTRATION. Orig: ${source_address} - ${error.response.status}`);
                            }
                        } else if(responseMessageLowerCase.includes('destination')) {
                            source_address_state.last_info_message = 'Donation check done and validated original address registration.';
                            console.log(`- ORIGINAL_ADDRESS_FOUND_AND_VALID_BUT_ASSIGMENT_UNKNOWN. Sorry, no way to check more unless you run real donation.`);
                            success = true
                        } else {
                            console.log(`- UNKNOWN - Unhandled is not registered response ${error.response.status} - ${getStatusDescription(error.response.status)} - ${error.response.statusText}`);
                        }
                    }
                    // Unfortunately we never below as we use fake invalid unregistered destination address info (also no propert api to check).
                    // That error comes first before checking the original address assignment in api unfortunately
                    else if(responseMessageLowerCase.includes('has an active donation assignment to')) {
                        source_address_state.last_donation_state = 'active';
                        const already_registered_address = extractAddr1(responseMessageLowerCase)
                        source_address_state.dest_addr = already_registered_address;
                        console.log(`- OK - Already assigned to ${already_registered_address}`);
                        success = true
                    }
                    else
                        console.log(`- UNKNOWN - Unhandled response ${error.response.status} - ${getStatusDescription(error.response.status)} - ${error.response.statusText}`);
                } else if(responseMessageLowerCase.includes('has an active donation assignment to')) {
                        source_address_state.last_donation_state = 'active';
                        const already_registered_address = extractAddr1(responseMessageLowerCase)
                        if(!source_address_state.dest_addr)
                             source_address_state.dest_addr = already_registered_address;
                        source_address_state.last_info_message = `Address was already assigned to ${already_registered_address}. This must be same as dest_addr or something odd.`;
                        console.log(`- OK - Already assigned to ${already_registered_address}`);
                        success = true
                } else {
                    console.error(`Unhandled error occurred: ${error.response.status} ${error.response.statusText}`);
                    console.error("Response Data:", error.response.data);
                }
            } else if (error.request)
                // Request was made, but no response was received
                console.error("No response received:", error.request);
            else
                // Something else triggered the error
                console.error("Error setting up request:", error.message);
        });
    }
    else {
        success = true
        console.log("- OK_TEST");
    }

    return success;
}