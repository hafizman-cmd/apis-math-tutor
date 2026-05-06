export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // This is the placeholder! Vercel will secretly inject your real key here.
    const API_KEY = process.env.REPLICATE_API_KEY;
    const { prompt } = req.body;

    try {
        // 1. Start the prediction 
        const startResponse = await fetch("https://api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`, // <-- Notice we use the variable here!
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: { prompt: prompt, max_new_tokens: 1024, temperature: 0.2 }
            })
        });

        const startData = await startResponse.json();
        if (startData.error) return res.status(500).json({ error: startData.error });

        // 2. Poll for the result
        let predictionUrl = startData.urls.get;
        let isFinished = false;
        let finalOutput = "";

        while (!isFinished) {
            await new Promise(r => setTimeout(r, 2000));
            const pollResponse = await fetch(predictionUrl, {
                headers: { "Authorization": `Bearer ${API_KEY}` } // <-- And here!
            });
            const pollData = await pollResponse.json();

            if (pollData.status === "succeeded") {
                isFinished = true;
                finalOutput = pollData.output.join("");
            } else if (pollData.status === "failed") {
                return res.status(500).json({ error: "Model failed." });
            }
        }

        // 3. Send the final answer back to your website
        res.status(200).json({ result: finalOutput });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}