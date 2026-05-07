export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Pulling your Google key from Vercel
    const API_KEY = process.env.GEMINI_API_KEY; 
    const { prompt, image } = req.body;

    try {
        // 1. Build the payload for Gemini
        const parts = [{ text: prompt }];
        
        // If an image was uploaded, attach it using Gemini's strict inlineData format
        if (image) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: image
                }
            });
        }

        // 2. Set the model to Gemini 2.5 Flash
        const model = "gemini-2.5-pro"; 
        
        // 3. Send the request to Google's servers
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: parts }]
            })
        });

        const data = await response.json();

        // Catch any Google-specific errors (like an invalid API key)
        if (!response.ok) {
            throw new Error(data.error?.message || "Google API Error");
        }

        // 4. Extract the beautifully formatted text from Gemini's response payload
        const finalOutput = data.candidates[0].content.parts[0].text;

        res.status(200).json({ result: finalOutput });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
}
