/**
 * Schemas zod para inputs de server actions del módulo Dashboard.
 *
 * Convención: cada schema corresponde 1:1 a una server action y describe los
 * fields del FormData submitted desde el modal/form correspondiente.
 */
import { z } from "zod";

export const setActiveClubSchema = z.object({
  club_id: z.string().min(1, "club_id required"),
});
