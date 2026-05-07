export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const API_KEY = process.env.REPLICATE_API_KEY;
    const { prompt, image } = req.body;

    try {
        // 1. Build the input payload specifically for Qwen2-VL
        const inputData = { 
            prompt: prompt,
            max_new_tokens: 512 // Qwen's max allowed token limit to prevent cut-offs
        };
        
        // Qwen2-VL requires the image to be explicitly labeled "media"
        if (image) {
            inputData.media = `data:image/jpeg;base64,${image}`;
        }

        // 2. Send the request to Replicate using the official Version Hash endpoint
        const response = await fetch(`https://api.replicate.com/v1/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "wait" 
            },
            body: JSON.stringify({ 
                // This is the exact 64-character hash for lucataco/qwen2-vl-7b-instruct
                version: "bf57361c75677fc33d480d0c5f02926e621b2caa2000347cb74aeae9d2ca07ee",
                input: inputData 
            })
        });

        const data = await response.json();
        
        // --- NEW ERROR CATCHING LOGIC ---
        // Replicate hides errors in "detail" instead of "error" sometimes
        if (!response.ok) {
            throw new Error(data.detail || data.title || "Replicate API rejected the request.");
        }
        if (data.error) {
            throw new Error(typeof data.error === 'string' ? data.error : data.error.message || "Unknown Replicate Error");
        }

        // If the model is taking too long to wake up, it won't have an output yet
        if (!data.output) {
            throw new Error(`The AI is currently "${data.status}". It took too long to wake up. Please try clicking solve again!`);
        }
        // --------------------------------

        // 4. Extract the answer
        let finalOutput = Array.isArray(data.output) ? data.output.join('') : data.output;

        res.status(200).json({ result: finalOutput });

    } catch (error) {
        // Send the exact error message back to the website so you can read it
        res.status(500).json({ error: error.message });
    }
}
