import axios from 'axios';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../config/index.js';
import { EventService } from './EventService.js';

export interface AlchemistResponse {
    score: number;
    summary: string;
    category: string;
    entities: string[];
}

export class AlchemistService {
    private openai: OpenAI | null = null;
    private anthropic: Anthropic | null = null;

    constructor() {
        if (CONFIG.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: CONFIG.OPENAI_API_KEY });
        }
        if (CONFIG.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic({ apiKey: CONFIG.ANTHROPIC_API_KEY });
        }
    }

    async analyzeSignal(text: string, provider: 'ollama' | 'openai' | 'anthropic' = 'ollama'): Promise<AlchemistResponse> {
        const prompt = `
      Act as "The Alchemist", a high-level intelligence analyst.
      Analyze the following article for "Passive Intelligence" value.
      
      CRITICAL SCORING CRITERIA:
      - High Score (80-100): Original research, concrete data points, contrarian insights, "leaked" details, technical deep-dives.
      - Medium Score (50-79): Decent summaries, useful aggregate news, tutorials with depth.
      - Low Score (0-49): Marketing fluff, SEO clickbait, generic listicles, navigation menus, login pages, or site footers.
      
      Return a STRICT JSON object:
      {
        "score": number,
        "summary": "1-sentence extremely concise gist",
        "category": "Technology | Finance | AI | Crypto | Business | etc",
        "entities": ["Company/Person Name"],
        "is_signal": boolean
      }

      Input Text:
      ${text.substring(0, 15000)}
    `;

        let rawResponse = '';

        try {
            const events = EventService.getInstance();
            events.emit({ type: 'alchemist', message: `Analyzing Signal with ${provider}...` });

            if (provider === 'ollama') {
                const response = await axios.post(`${CONFIG.OLLAMA_HOST}/api/generate`, {
                    model: 'llama3',
                    prompt,
                    stream: false,
                });
                rawResponse = response.data.response;
            } else if (provider === 'openai' && this.openai) {
                const completion = await this.openai.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'gpt-4o',
                    response_format: { type: 'json_object' },
                });
                rawResponse = completion.choices[0].message.content || '';
            } else if (provider === 'anthropic' && this.anthropic) {
                const message = await this.anthropic.messages.create({
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }],
                    model: 'claude-3-5-sonnet-20240620',
                });
                rawResponse = (message.content[0] as any).text || '';
            }

            const result = this.parseRobustJSON(rawResponse);
            events.emit({
                type: 'alchemist',
                message: `Analysis Complete: Score ${result.score}`,
                data: { category: result.category }
            });
            return result;
        } catch (error) {
            console.error(`Alchemist error (${provider}):`, error);
            return { score: 0, summary: 'Failed to analyze', category: 'Error', entities: [] };
        }
    }

    private parseRobustJSON(input: string): AlchemistResponse {
        try {
            const jsonMatch = input.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : input;
            const cleaned = jsonStr
                .replace(/<\|[\s\S]*?\|>/g, '')
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleaned);
        } catch (e) {
            throw new Error('Malformed AI response');
        }
    }
}
