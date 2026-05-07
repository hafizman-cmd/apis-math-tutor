export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // We are back to using the Replicate key!
    const API_KEY = process.env.REPLICATE_API_KEY;
    const { prompt, image } = req.body;

    try {
        // 1. Build the input payload
        const inputData = { 
            prompt: prompt 
        };
        
        // Replicate requires the image string to explicitly state it is a base64 jpeg
        if (image) {
            inputData.image = `data:image/jpeg;base64,${image}`;
        }

        // 2. Set the specific model. 
        const replicateModel = "lucataco/qwen3-vl-8b-instruct"; 

        // 3. Send the request to Replicate
        const response = await fetch(`https://api.replicate.com/v1/models/${replicateModel}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                // This magic header tells Replicate to hold the connection open and 
                // return the final answer immediately, saving us from writing polling loops!
                "Prefer": "wait" 
            },
            body: JSON.stringify({ input: inputData })
        });

        const data = await response.json();
        
        if (data.error) return res.status(500).json({ error: data.error });

        // 4. Replicate often returns text outputs as an array of string chunks. 
        // We join them together into one solid paragraph.
        let finalOutput = Array.isArray(data.output) ? data.output.join('') : data.output;

        res.status(200).json({ result: finalOutput });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
