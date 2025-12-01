import { AI_PERSONAS } from "../constants/personas";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Core function to fetch from Gemini API with a reliable timeout.
 * @param {object} requestBody - The body of the request to send to the API.
 */
async function fetchWithFallbacks(requestBody, signal) {
    // The AbortController is now managed by the component, so we just use the signal.
    // A timeout is still a good idea as a fallback.
    const timeoutId = setTimeout(() => {
        // This will only fire if the component's AbortController isn't used first.
    }, 20000); // 20-second hard timeout

    try {
        console.log(`Requesting from Gemini...`);
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: signal // Use the signal passed from the component
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`HTTP error! Status: ${response.status}`, errorBody);
            throw new Error(`AI request failed with status: ${response.status}`);
        }

        return await response.json(); // Success!
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            // This error will be caught by the component, which knows if it was a timeout or a user cancel.
            throw error;
        }
        // Re-throw other network or HTTP errors
        throw error;
    }
}

export const generateMotivatingDescription = async (goalTitle) => {
    const systemPrompt = `
              You are an ADHD Executive Function Coach. The user is promoting a task to a weekly goal. Your job is to generate a concise (2 sentence max), inspiring, and clarifying description for this goal.
              The description should answer: "Why am I doing this?" and "What is the expected long-term win?" Use motivating and encouraging language.
              Goal: "${goalTitle}"
              Return ONLY the raw string description. Do NOT use markdown formatting or any prefixes (e.g., do not start with "Description:" or "Here is the plan:").
            `;
    const requestBody = {
        contents: [{ parts: [{ text: `Generate description for goal: ${goalTitle}` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const data = await fetchWithFallbacks(requestBody, null); // No signal needed here
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return textResponse || 'No AI description generated.';
};

async function generateContent(systemPrompt, userPrompt, signal) {
    const requestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
    };

    const data = await fetchWithFallbacks(requestBody, signal);
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
        console.error("Invalid AI response format:", data);
        throw new Error('Invalid AI response format.');
    }

    try {
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("AI returned invalid JSON:", textResponse);
        throw new Error("AI returned data in an unexpected format.");
    }
}

export const organizeBrainDump = (brainDumpInput, activeContext, signal) => {
    console.log(`organizeBrainDump called for ${activeContext} context with:`, brainDumpInput);

    const workPrompt = `You are an executive function assistant for a user with ADHD. Your job is to convert a messy "Work Dump" into a clear, actionable list of tasks.

RULES:
1.  **Strict Isolation**: If the user lists multiple items for the SAME action (e.g., 'Train on X, Y, and Z'), always split them into separate tasks for micro-focus.
2.  **Verb Preservation**: Preserve the main action verb (e.g., 'Train' or 'Work on') in each split item.
3.  **No Fluff**: Remove phrases like 'I need to', 'maybe', or 'don't forget to'. Filter out anxiety and self-judgment, leaving only the pure action item.
4.  **One Action Per Task**: Each item in the output array must represent a single, concrete action.
5.  **Start With a Verb**: Every task must begin with a strong, clear verb.
6.  **No Commentary**: Do not add any extra text, explanations, or apologies.

EXAMPLE:
User Input: "I should really train on Github and Jira, and then buy milk later on."
Your Output: ["Train on GitHub", "Train on Jira", "Buy milk"]

User Input: "Work on vnoxx, and implement new features for broadsign, also check blank slot."
Your Output: ["Work on vnoxx", "Implement new Broadsign features", "Check blank slot"]

You MUST return ONLY a raw JSON array of strings.`;

    const lifePrompt = `You are an expert task-splitter for users with ADHD. Your job is to convert a messy "Life Dump" into a clear, actionable list of tasks.

RULES:
1.  **One Action Per Task**: Each item must be a single, concrete action.
2.  **Start With a Verb**: Every task must begin with a verb (e.g., "Call," "Buy," "Research").
3.  **Split Vague Goals**: If the input is a high-level goal (e.g., "plan vacation"), break it into immediate next steps.
4.  **Fix & Structure**: Interpret user intent, fix grammar, and ignore typos.
5.  **Be Concise**: Keep tasks short and to the point.
6.  **No Commentary**: Do not add any extra text or explanations.

You MUST return ONLY a raw JSON array of strings.`;

    const systemPrompt = activeContext === 'work' ? workPrompt : lifePrompt;
    return generateContent(systemPrompt, brainDumpInput, signal);
};

export const organizeGoalTasks = (goalDumpInput, activePersona) => {
    const systemPrompt = AI_PERSONAS[activePersona].prompt;
    return generateContent(systemPrompt, goalDumpInput, null); // No signal needed here
};