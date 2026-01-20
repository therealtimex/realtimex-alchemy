import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface AlchemyEvent {
    id?: string;
    type: 'miner' | 'router' | 'alchemist' | 'system' | 'history';
    message: string;
    timestamp?: string;
    data?: any;
}

export class EventService {
    private static instance: EventService;
    private clients: Response[] = [];
    private eventHistory: AlchemyEvent[] = [];
    private maxHistory = 50;

    private constructor() { }

    public static getInstance(): EventService {
        if (!EventService.instance) {
            EventService.instance = new EventService();
        }
        return EventService.instance;
    }

    public addClient(res: Response) {
        this.clients.push(res);

        // Send connection success
        this.sendEvent(res, {
            type: 'system',
            message: 'Alchemy Engine Connected',
            timestamp: new Date().toISOString()
        });

        // Send history
        if (this.eventHistory.length > 0) {
            this.sendEvent(res, {
                type: 'history',
                message: 'Event History',
                data: this.eventHistory
            });
        }
    }

    public removeClient(res: Response) {
        this.clients = this.clients.filter(client => client !== res);
    }

    public emit(event: AlchemyEvent) {
        const fullEvent = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            ...event
        };

        // Add to history
        this.eventHistory.unshift(fullEvent);
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.pop();
        }

        // Broadcast to all clients
        this.clients.forEach(client => {
            this.sendEvent(client, fullEvent);
        });
    }

    private sendEvent(res: Response, event: any) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
}
