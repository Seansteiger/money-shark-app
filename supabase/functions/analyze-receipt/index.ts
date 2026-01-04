
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { image_path, image_base64 } = await req.json();

        // Initialize Supabase Client
        // Access env vars directly in Edge Function environment
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // Retrieve Gemini API Key from site_settings table to avoid env var exposure if not set in dashboard
        const { data: settings } = await supabaseClient
            .from('site_settings')
            .select('value')
            .eq('key', 'gemini_api_key')
            .single();

        const apiKey = settings?.value?.key || Deno.env.get('GEMINI_API_KEY');

        if (!apiKey) {
            throw new Error("Gemini API Key not configured in settings or environment");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Prepare Image Part
        let parts = [];
        if (image_base64) {
            parts = [
                { inlineData: { mimeType: "image/jpeg", data: image_base64 } },
            ];
        } else if (image_path) {
            // Download from Supabase Storage
            const { data: fileData, error: downloadError } = await supabaseClient
                .storage
                .from('shark-receipts')
                .download(image_path);

            if (downloadError) throw downloadError;

            const arrayBuffer = await fileData.arrayBuffer();
            const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

            parts = [
                { inlineData: { mimeType: "image/jpeg", data: base64 } }
            ];
        }

        const prompt = `Analyze this image for loan/debt information. 
      Extract: customer name, principal amount, date of transaction.
      Return JSON only without markdown formatting. Format:
      { "customerName": string, "amount": number, "date": string (YYYY-MM-DD), "clarification": string }`;

        const result = await model.generateContent([prompt, ...parts]);
        const response = await result.response;
        const text = response.text();

        // Clean JSON
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
