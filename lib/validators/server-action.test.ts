import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formDataToObject, parseFormData } from "./server-action";

describe("formDataToObject", () => {
  it("convierte FormData a plain object", () => {
    const fd = new FormData();
    fd.set("a", "1");
    fd.set("b", "2");
    expect(formDataToObject(fd)).toEqual({ a: "1", b: "2" });
  });

  it("agrupa values múltiples del mismo key como array", () => {
    const fd = new FormData();
    fd.append("ids", "1");
    fd.append("ids", "2");
    fd.append("ids", "3");
    expect(formDataToObject(fd)).toEqual({ ids: ["1", "2", "3"] });
  });

  it("retorna object vacío para FormData vacío", () => {
    expect(formDataToObject(new FormData())).toEqual({});
  });
});

describe("parseFormData", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().positive(),
  });

  it("retorna ok con data tipada cuando matchea schema", () => {
    const fd = new FormData();
    fd.set("name", "Joaco");
    fd.set("age", "30");
    const result = parseFormData(fd, schema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ name: "Joaco", age: 30 });
    }
  });

  it("retorna error con firstError descriptivo cuando falla", () => {
    const fd = new FormData();
    fd.set("name", "");
    fd.set("age", "abc");
    const result = parseFormData(fd, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.firstError).toBeTruthy();
      expect(result.firstError).toContain(":");
    }
  });

  it("falla cuando falta un field requerido", () => {
    const fd = new FormData();
    fd.set("name", "Joaco");
    // age missing
    const result = parseFormData(fd, schema);
    expect(result.ok).toBe(false);
  });
});
