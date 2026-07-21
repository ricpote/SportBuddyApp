export type Migration = {
  id: string;
  description: string;
  run: () => Promise<void>;
};
