export default function LogoHeader() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 32px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <img
        src="/maverick-logo.png"
        alt="Maverick Telecommunication"
        style={{ height: "44px", objectFit: "contain" }}
      />
      <span style={{ fontSize: "15px", fontWeight: "600", color: "#374151" }}>
        Loyalty Rewards
      </span>
      <img
        src="/mtn-logo.png"
        alt="MTN"
        style={{ height: "44px", objectFit: "contain" }}
      />
    </header>
  );
}
