export type SkillLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "competitive";

export type ActivityStatus =
  | "open"
  | "full"
  | "cancelled"
  | "completed";


export type activityLocation={
  name:string;
  lat:number;
  long:number;
  address:string;
}
export type activity={
  id:number;
  title:string;
  description:string;
  createdBy:u;







}