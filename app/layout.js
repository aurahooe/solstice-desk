import "./globals.css";

export const metadata = {
  title: "Solstice Desk",
  description: "A living hourbook. Public slips take the desk once an hour.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
