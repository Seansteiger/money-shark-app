const https = require('https');

// Load environment variables from local env files
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'YOUR_API_TOKEN';
const DOMAIN = process.env.CLOUDFLARE_DOMAIN || 'seansteiger.co.za';
const SUBDOMAINS = process.env.CLOUDFLARE_SUBDOMAINS ? process.env.CLOUDFLARE_SUBDOMAINS.split(',') : ['moneyshark'];
const TARGET = 'cname.vercel-dns.com';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(JSON.stringify(parsed.errors || parsed)));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  console.log(`Querying Cloudflare zone for domain: ${DOMAIN}...`);
  
  const zoneOptions = {
    hostname: 'api.cloudflare.com',
    path: `/client/v4/zones?name=${DOMAIN}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const zoneRes = await request(zoneOptions);
    if (!zoneRes.result || zoneRes.result.length === 0) {
      throw new Error(`Domain ${DOMAIN} not found in your Cloudflare account.`);
    }

    const zoneId = zoneRes.result[0].id;
    console.log(`Found Zone ID: ${zoneId}`);

    for (const sub of SUBDOMAINS) {
      const fullSubdomain = `${sub}.${DOMAIN}`;
      console.log(`\nConfiguring DNS record for ${fullSubdomain}...`);

      // 1. Check if record already exists to avoid duplicates
      const checkOptions = {
        hostname: 'api.cloudflare.com',
        path: `/client/v4/zones/${zoneId}/dns_records?name=${fullSubdomain}&type=CNAME`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };

      const checkRes = await request(checkOptions);
      if (checkRes.result && checkRes.result.length > 0) {
        console.log(`Record for ${fullSubdomain} already exists (ID: ${checkRes.result[0].id}). Updating record...`);
        
        const updateOptions = {
          hostname: 'api.cloudflare.com',
          path: `/client/v4/zones/${zoneId}/dns_records/${checkRes.result[0].id}`,
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };

        await request(updateOptions, {
          type: 'CNAME',
          name: sub,
          content: TARGET,
          ttl: 1,
          proxied: false
        });
        console.log(`Successfully updated: ${fullSubdomain} -> ${TARGET} (DNS Only)`);
      } else {
        // 2. Create new record
        const createOptions = {
          hostname: 'api.cloudflare.com',
          path: `/client/v4/zones/${zoneId}/dns_records`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };

        await request(createOptions, {
          type: 'CNAME',
          name: sub,
          content: TARGET,
          ttl: 1,
          proxied: false
        });
        console.log(`Successfully created: ${fullSubdomain} -> ${TARGET} (DNS Only)`);
      }
    }

    console.log('\nAll Cloudflare DNS subdomains successfully configured!');
  } catch (err) {
    console.error('\nError configuring DNS records:', err.message);
    process.exit(1);
  }
}

main();
