export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Make sure your REPLICATE_API_KEY is still in your Vercel Environment Variables!
    const API_KEY = process.env.REPLICATE_API_KEY; 
    const { prompt, image } = req.body;

    try {
        // 1. Build the payload for Molmo
        const inputData = { 
            // Molmo specifically asks for 'text' instead of 'prompt'
            text: `You are a math tutor. Explain step-by-step.\n\nProblem: ${prompt}`,
            // Force it to write longer answers
            max_new_tokens: 1000 
        };
        
        if (image) {
            inputData.image = `data:image/jpeg;base64,${image}`;
        }

        // 2. Point it to the Molmo model on Replicate
        const replicateModel = "zsxkib/molmo-7b"; 

        // 3. Send the request
        const response = await fetch(`https://api.replicate.com/v1/models/${replicateModel}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "wait" 
            },
            body: JSON.stringify({ input: inputData })
        });

        const data = await response.json();

        // Error Catching
        if (!response.ok) {
            throw new Error(data.detail || data.title || "Replicate API rejected the request.");
        }
        if (data.error) {
            throw new Error(typeof data.error === 'string' ? data.error : data.error.message || "Unknown Replicate Error");
        }
        if (!data.output) {
            throw new Error(`The AI is currently "${data.status}". It took too long to wake up. Please try again!`);
        }

        // 4. Extract the answer
        let finalOutput = Array.isArray(data.output) ? data.output.join('') : data.output;

        res.status(200).json({ result: finalOutput });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
}