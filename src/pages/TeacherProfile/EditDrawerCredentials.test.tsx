import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "../../i18n";
import type { Teacher } from "../../app/api/teachersApi/types";
import { EditDrawer } from "./TeacherProfile";

// The login a teacher is handed is the phone and password saved here.
const TEACHER: Teacher = {
  id: "t1", name: "Olim Karimov", photo: null, email: null, phone: "+998901234567", gender: "MALE", birthdate: null,
  specialization: null, experience: null, salary: null, status: "ACTIVE", branches: [{ id: "b1", name: "Grammar Campus" }],
};

const setup = (teacher: Teacher = TEACHER) => {
  const onSave = vi.fn();
  render(<EditDrawer teacher={teacher} open onClose={() => undefined} branches={[]} onSave={onSave} isSaving={false} />);
  const phone = () => screen.getByPlaceholderText("93 986 66 76") as HTMLInputElement;
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  const openPassword = () => fireEvent.click(screen.getByText("+ Set password"));
  const password = () => screen.getByPlaceholderText("New password") as HTMLInputElement;
  return { onSave, phone, submit, openPassword, password };
};

describe("Teacher profile edit drawer - the teacher's login", () => {
  it("shows the digits after the fixed +998 box, not the whole number again", () => {
    const { phone } = setup();
    expect(phone().value).toBe("901234567");
  });

  it("saves the phone as +998 and 9 digits, whatever shape it was typed or saved in", () => {
    const { onSave, phone, submit } = setup({ ...TEACHER, phone: "90 123 45 67" });
    expect(phone().value).toBe("901234567");

    fireEvent.change(phone(), { target: { value: "91 765 43 21" } });
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ phone: "+998917654321" }));
  });

  it("sends the password exactly as typed - leading and trailing spaces are part of it", () => {
    const { onSave, openPassword, password, submit } = setup();
    openPassword();

    fireEvent.change(password(), { target: { value: "  abc 123  " } });
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ password: "  abc 123  " }));
  });

  it("sends no password when none is typed, so the current one stays", () => {
    const { onSave, submit } = setup();
    submit();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ password: undefined }));
  });

  it("refuses a password shorter than the login accepts, and says so", () => {
    const { onSave, openPassword, password, submit } = setup();
    openPassword();

    fireEvent.change(password(), { target: { value: "abc" } });
    submit();

    expect(screen.getByText(/Password must be at least 6 characters/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a phone that is not a full number, and says so", () => {
    const { onSave, phone, submit } = setup();

    fireEvent.change(phone(), { target: { value: "90 12" } });
    submit();

    expect(screen.getByText("Enter the 9 digits of the phone number after +998")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("can show the typed password so it can be checked before it is handed over", () => {
    const { openPassword, password } = setup();
    openPassword();
    fireEvent.change(password(), { target: { value: "abc123" } });
    expect(password().type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    expect(password().type).toBe("text");
  });
});
