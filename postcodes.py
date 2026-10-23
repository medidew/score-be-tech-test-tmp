import http.client
import json
import ssl

import certifi

# when postcode empty
# when postcode invalid
# when region is null
# when postcode has is not capitalised or has extra spaces? service handles
# TODO when country returned outside ons dataset support
def postcode_to_region(postcode):
    """Receives postcode as a str and returns the region when inside England
    Otherwise returns country"""
    if not isinstance(postcode, str):
        raise TypeError("Postcode must be a string")
    
    if not postcode.strip():
        raise ValueError("Postcode cannot be empty")
    # Supplement system certificates for Python installations without a CA bundle.
    context = ssl.create_default_context()
    context.load_verify_locations(cafile=certifi.where())
    conn = http.client.HTTPSConnection("api.postcodes.io", timeout=5, context=context)
    body = ""
    headers = {
        "Accept": "application/json"
    }

    url = f"/postcodes/{postcode}"
    url = url.replace(" ", "%20")
    
    try:
        conn.request("GET", url, body, headers)
        response = conn.getresponse()
        
        if response.status == 404:
            return None

        if response.status != 200:
            raise RuntimeError(f"Postcode lookup service failed: {response.reason}")
        
        data = json.loads(response.read())
        result = data["result"]
        
        if result["region"]:
            return result["region"]
        
        return result["country"]
    
    finally:
        conn.close()
    # If ONS doesn't cover country or region, report an unsupported location. do not invent estimates


if __name__ == "__main__":  
    print(postcode_to_region(""))
