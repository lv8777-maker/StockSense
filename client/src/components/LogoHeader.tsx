export default function LogoHeader() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 40px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <img
        src="/maverick-logo.png"
        alt="Maverick Telecommunication"
        style={{ height: "48px", objectFit: "contain" }}
      />
      <img
        src="/mtn-logo.png"
        alt="MTN"
        style={{ height: "48px", objectFit: "contain" }}
      />
    </header>
  );
}
