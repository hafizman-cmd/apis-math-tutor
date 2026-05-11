export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const API_KEY = process.env.REPLICATE_API_KEY; 
    const { prompt, image } = req.body;

    try {
        let extractedMathText = "";

        // ==========================================
        // MODEL 1: THE EYES (Qwen2-VL via Version Hash)
        // ==========================================
        if (image) {
            const visionResponse = await fetch(`https://api.replicate.com/v1/predictions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "wait" 
                },
                body: JSON.stringify({
                    // Qwen2-VL 7B Instruct's exact version hash
                    version: "bf57361c75677fc33d480d0c5f02926e621b2caa2000347cb74aeae9d2ca07ee",
                    input: { 
                        media: `data:image/jpeg;base64,${image}`, // Qwen demands 'media' instead of 'image'
                        prompt: "Extract the mathematical equation or text from this image perfectly. Output ONLY the raw equation text. Do not solve it. Do not add any conversational text.",
                        max_new_tokens: 512
                    }
                })
            });

            const visionData = await visionResponse.json();
            
            if (!visionResponse.ok) {
                throw new Error(visionData.detail || "Vision Model Error: Could not read the image.");
            }

            extractedMathText = Array.isArray(visionData.output) ? visionData.output.join('') : visionData.output;
        }

        // ==========================================
        // PREPARE THE FINAL PROMPT
        // ==========================================
        let combinedPrompt = prompt;
        
        // If the Vision model read an image, inject what it saw into the Maverick prompt
        if (extractedMathText) {
            combinedPrompt = combinedPrompt.replace(
                "**PROBLEM TO SOLVE:**", 
                `**PROBLEM TO SOLVE:**\n[Extracted from Image by Qwen]: ${extractedMathText}`
            );
        }

        // ==========================================
        // MODEL 2: THE BRAIN (Llama 4 Maverick)
        // ==========================================
        const solverResponse = await fetch(`https://api.replicate.com/v1/models/meta/llama-4-maverick-instruct/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "wait" 
            },
            body: JSON.stringify({ 
                input: { 
                    prompt: combinedPrompt,
                    // Llama 4 Maverick uses 'max_tokens' (instead of max_new_tokens)
                    max_tokens: 4096 
                } 
            })
        });

        const solverData = await solverResponse.json();

        if (!solverResponse.ok) {
            throw new Error(solverData.detail || "Solver Model Error: Could not generate the math solution.");
        }

        // Extract the final answer and send it to the frontend
        let finalOutput = Array.isArray(solverData.output) ? solverData.output.join('') : solverData.output;

        res.status(200).json({ result: finalOutput });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
}