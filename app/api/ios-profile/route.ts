import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Read high-resolution icon from public/icons
    const iconPath = path.join(process.cwd(), 'public', 'icons', 'apple-touch-icon.png');
    let iconBase64 = '';

    if (fs.existsSync(iconPath)) {
      const iconBuffer = fs.readFileSync(iconPath);
      iconBase64 = iconBuffer.toString('base64');
    }

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://money-shark-app.vercel.app';

    const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			${iconBase64 ? `<key>Icon</key>\n\t\t\t<data>\n\t\t\t\t${iconBase64}\n\t\t\t</data>` : ''}
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>Money Shark</string>
			<key>PayloadDescription</key>
			<string>Installs Money Shark directly on your iPhone / iPad Home Screen.</string>
			<key>PayloadDisplayName</key>
			<string>Money Shark</string>
			<key>PayloadIdentifier</key>
			<string>com.steigeronline.moneyshark.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>8f12c710-41ea-4d89-9fa9-4b6805175901</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>${appUrl}</string>
		</dict>
	</array>
	<key>PayloadDisplayName</key>
	<string>Money Shark App</string>
	<key>PayloadDescription</key>
	<string>Installs the Money Shark web application on your iOS Home Screen.</string>
	<key>PayloadIdentifier</key>
	<string>com.steigeronline.moneyshark.profile</string>
	<key>PayloadOrganization</key>
	<string>Money Shark</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>8f12c710-41ea-4d89-9fa9-4b6805175902</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;

    return new NextResponse(mobileconfig, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config; charset=utf-8',
        'Content-Disposition': 'attachment; filename="MoneyShark.mobileconfig"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to generate iOS mobileconfig:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
