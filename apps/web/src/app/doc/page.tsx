import { redirect } from "next/navigation"

export default function DocIndexPage() {
  // If someone goes to /doc directly, redirect them to the home/dashboard page
  // rather than showing a 404 Not Found error.
  redirect("/")
}
