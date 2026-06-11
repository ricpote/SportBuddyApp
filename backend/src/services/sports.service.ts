import { db } from "../config/firebase";
import { Sport } from "../models/sport.model";

const SPORTS_COLLECTION = "sports";

export class SportsService {
  private sportsRef = db.collection(SPORTS_COLLECTION);

  async listSports(): Promise<Sport[]> {
    const snapshot = await this.sportsRef.get();

    return snapshot.docs.map((doc) => doc.data() as Sport);
  }

  async getSportById(sportId: string): Promise<Sport | null> {
    const doc = await this.sportsRef.doc(sportId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as Sport;
  }
}

export const sportsService = new SportsService();
