
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { EnrichmentResult, FallbackResult, GroundingLink, Profile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Identifies basic role/company for a profile missing info.
 */
export async function identifyRole(name: string, linkedinUrl?: string): Promise<{ title: string; company: string; region: string }> {
  const prompt = `
    Identify the current professional role, company, and geographic region for this person.
    Name: ${name}
    ${linkedinUrl ? `LinkedIn: ${linkedinUrl}` : ''}

    Return JSON:
    { "title": "Current Job Title", "company": "Current Company", "region": "City, State or Region" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            company: { type: Type.STRING },
            region: { type: Type.STRING }
          },
          required: ["title", "company", "region"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Role Identification Error:", error);
    return { title: '', company: '', region: '' };
  }
}

/**
 * AI Recommendation Agent: Matches user query against the whole profile set.
 */
export async function recommendProfiles(
  query: string,
  profiles: Profile[]
): Promise<Array<{ id: string, score: number, reason: string }>> {
  // Create a condensed representation for the model
  const context = profiles.map(p => ({
    id: p.id,
    info: `${p.name}, ${p.title} @ ${p.company} in ${p.region}. Background: ${p.background}. Skills: ${(p.skills || []).join(', ')}`
  }));

  const prompt = `
    You are an expert Networking Agent. Given the following user request and a list of professional profiles, 
    recommend the best matches.

    USER REQUEST: "${query}"

    PROFILES:
    ${JSON.stringify(context, null, 2)}

    For each matching profile, return:
    1. The exact "id"
    2. A "score" from 0-100 (100 being perfect match)
    3. A "reason" (max 15 words) explaining why this specific person matches the request.

    Return a JSON array of objects. Return an empty array if no relevance is found.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              score: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            },
            required: ["id", "score", "reason"]
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Agent Recommendation Error:", error);
    return [];
  }
}

/**
 * Deep extraction of profile info.
 */
export async function enrichWithGemini(
  name: string,
  title: string,
  company: string,
  linkedinUrl?: string
): Promise<EnrichmentResult> {
  const prompt = `
    Perform a deep professional analysis of this person.
    Name: ${name}
    Role: ${title} at ${company}
    ${linkedinUrl ? `LinkedIn: ${linkedinUrl}` : ''}

    Extract and return a JSON object with:
    1. "years_of_experience": Estimated total years of professional experience (e.g. "8", "12+", "2"). Return a string.
    2. "region": Geographic location/area (e.g. "San Francisco Bay Area", "New York", "London").
    3. "background": 2-3 sentence summary of professional history.
    4. "what_they_do": 1-2 sentences on current responsibilities.
    5. "achievements": Notable awards or recognition.
    6. "skills": Array of 5-15 skills.
    7. "is_valid": boolean (true if info is found).

    Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            years_of_experience: { type: Type.STRING, description: "Total years of professional experience" },
            region: { type: Type.STRING },
            background: { type: Type.STRING },
            what_they_do: { type: Type.STRING },
            achievements: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            is_valid: { type: Type.BOOLEAN }
          },
          required: ["years_of_experience", "region", "background", "what_they_do", "achievements", "skills", "is_valid"]
        }
      },
    });

    const result = JSON.parse(response.text.trim());
    const groundingUrls: GroundingLink[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          groundingUrls.push({ uri: chunk.web.uri, title: chunk.web.title || "Source" });
        }
      });
    }

    return { ...result, grounding_urls: groundingUrls } as EnrichmentResult;
  } catch (error) {
    console.error(`Gemini Enrichment Error for ${name}:`, error);
    throw error;
  }
}

export async function inferFromTitle(title: string, company: string): Promise<FallbackResult> {
  if (!title && !company) {
    return { typical_responsibilities: "Information unavailable.", typical_skills: ["Professional"] };
  }
  const prompt = `Provide typical responsibilities and skills for: ${title} at ${company}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            typical_responsibilities: { type: Type.STRING },
            typical_skills: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["typical_responsibilities", "typical_skills"]
        }
      }
    });
    return JSON.parse(response.text.trim()) as FallbackResult;
  } catch (error) {
    return { typical_responsibilities: "N/A", typical_skills: [] };
  }
}
