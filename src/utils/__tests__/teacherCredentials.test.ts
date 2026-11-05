import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, teacherPhoneForRequest, validateTeacherPassword, validateTeacherPhone } from "../teacherCredentials";

describe("validateTeacherPhone", () => {
  it("accepts 9 digits however they are written", () => {
    for (const input of ["901234567", "90 123 45 67", "(90) 123-45-67", "+998 90 123 45 67", "998901234567"]) {
      expect(validateTeacherPhone(input)).toBeNull();
    }
  });

  it("asks for a phone when nothing usable is typed", () => {
    expect(validateTeacherPhone("")).toBe("phoneRequired");
    expect(validateTeacherPhone("   ")).toBe("phoneRequired");
    expect(validateTeacherPhone("abc")).toBe("phoneRequired");
  });

  it("refuses a number that is not 9 digits - the teacher could never log in with it", () => {
    expect(validateTeacherPhone("9012345")).toBe("phoneInvalid");
    expect(validateTeacherPhone("90123456789")).toBe("phoneInvalid");
  });

  it("lets an odd number that was saved before stay as it is while it is untouched", () => {
    expect(validateTeacherPhone("12345", "12345")).toBeNull();
    expect(validateTeacherPhone("12 345", "12345")).toBeNull();
    expect(validateTeacherPhone("1234", "12345")).toBe("phoneInvalid");
  });
});

describe("teacherPhoneForRequest", () => {
  it("sends +998 and 9 digits - the shape staff and the login use", () => {
    expect(teacherPhoneForRequest("90 123 45 67")).toBe("+998901234567");
    expect(teacherPhoneForRequest("901234567")).toBe("+998901234567");
    expect(teacherPhoneForRequest("+998 (90) 123-45-67")).toBe("+998901234567");
  });

  it("sends nothing for a value that is not a full number (an untouched odd saved one)", () => {
    expect(teacherPhoneForRequest("12345")).toBeUndefined();
    expect(teacherPhoneForRequest("")).toBeUndefined();
  });
});

describe("validateTeacherPassword", () => {
  it("needs the same minimum as the login", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6);
    expect(validateTeacherPassword("12345")).toBe("passwordTooShort");
    expect(validateTeacherPassword("123456")).toBeNull();
  });

  it("treats an empty password as 'none set' and never judges it", () => {
    expect(validateTeacherPassword("")).toBeNull();
  });

  it("counts a password exactly as typed - spaces included", () => {
    expect(validateTeacherPassword("  a  ")).toBe("passwordTooShort");
    expect(validateTeacherPassword(" abcde ")).toBeNull();
  });
});
