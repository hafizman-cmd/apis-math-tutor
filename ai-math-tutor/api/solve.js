export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Notice we are using a new variable name here for Google!
    const API_KEY = process.env.GEMINI_API_KEY;
    const { prompt, image } = req.body;

    try {
        // 1. Build the request payload
        let parts = [{ "text": prompt }];
        
        // If the user uploaded an image, attach it to the request so Gemini can see it
        if (image) {
            parts.push({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": image
                }
            });
        }

        const payload = {
            "contents": [{
                "parts": parts
            }]
        };

        // 2. Send the request directly to Google's Gemini 1.5 Flash model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) return res.status(500).json({ error: data.error.message });

        // 3. Extract the text answer from Google's response format
        const finalOutput = data.candidates[0].content.parts[0].text;

        // 4. Send the final answer back to your website
        res.status(200).json({ result: finalOutput });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}