import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+91", country: "IN", name: "India" },
  { code: "+1", country: "US", name: "United States" },
  { code: "+44", country: "GB", name: "United Kingdom" },
  { code: "+61", country: "AU", name: "Australia" },
  { code: "+971", country: "AE", name: "UAE" },
  { code: "+974", country: "QA", name: "Qatar" },
  { code: "+966", country: "SA", name: "Saudi Arabia" },
  { code: "+65", country: "SG", name: "Singapore" },
  { code: "+60", country: "MY", name: "Malaysia" },
  { code: "+1", country: "CA", name: "Canada" },
  { code: "+49", country: "DE", name: "Germany" },
  { code: "+33", country: "FR", name: "France" },
  { code: "+81", country: "JP", name: "Japan" },
  { code: "+86", country: "CN", name: "China" },
  { code: "+7", country: "RU", name: "Russia" },
  { code: "+55", country: "BR", name: "Brazil" },
  { code: "+27", country: "ZA", name: "South Africa" },
  { code: "+234", country: "NG", name: "Nigeria" },
  { code: "+92", country: "PK", name: "Pakistan" },
  { code: "+880", country: "BD", name: "Bangladesh" },
  { code: "+94", country: "LK", name: "Sri Lanka" },
  { code: "+977", country: "NP", name: "Nepal" },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function PhoneInput({
  value,
  onChange,
  required,
  disabled,
  placeholder = "Phone Number",
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value.replace(/\D/g, "");
    setPhoneNumber(num);
    onChange(`${selectedCountry.code}${num}`);
  };

  const handleCountrySelect = (country: typeof COUNTRY_CODES[0]) => {
    setSelectedCountry(country);
    onChange(`${country.code}${phoneNumber}`);
    setDropdownOpen(false);
    setSearch("");
  };

  const filtered = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search) ||
      c.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 rounded-l-lg border border-r-0 border-input bg-background px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors min-w-[80px]"
      >
        <span className="font-medium">{selectedCountry.code}</span>
        <span className="text-xs text-muted-foreground">{selectedCountry.country}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
      </button>

      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 rounded-r-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />

      {dropdownOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border border-border bg-card shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No results</p>
            ) : (
              filtered.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-left
                    ${selectedCountry.code === c.code && selectedCountry.country === c.country
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground"}`}
                >
                  <span className="font-medium min-w-[40px] text-primary">{c.code}</span>
                  <span>{c.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{c.country}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}