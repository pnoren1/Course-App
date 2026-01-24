import { redirect } from "next/navigation";

export default function Home() {
  // הפניה לדף הלוגין במקום לדף הקורס
  redirect("/login");
}
