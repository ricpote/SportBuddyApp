export type SportCategory = "team" | "individual";

export type Sport = {
  id: string;
  name: string;
  description: string;
  category: SportCategory;
};
export type CreateSportDto = {
  id: string;
  name: string;
  description: string;
  category: SportCategory;
};

export function createSportObject(data: CreateSportDto): Sport {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
  };
}