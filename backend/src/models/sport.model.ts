export type SportCategory = "team" | "individual";

export type Sport = {
  id: string;
  name: string;
  description: string;
  category: SportCategory;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSportDto = {
  id: string;
  name: string;
  description: string;
  category: SportCategory;
  emoji: string;
};

export type UpdateSportDto = {
  name?: string;
  description?: string;
  category?: SportCategory;
  emoji?: string;
};

export function createSportObject(data: CreateSportDto): Sport {
  const now = new Date();
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    emoji: data.emoji,
    createdAt: now,
    updatedAt: now,
  };
}