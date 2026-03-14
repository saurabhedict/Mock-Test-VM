import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react"; // added

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          <div>
            <Link to="https://mockexam.vidyarthimitra.org/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Vidyarthi Mitra"
                className="h-9 w-auto"
                onError={(e) => {
                  // (e.target)..display = 'none';
                }}
              />
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Practice mock tests for competitive exams with real exam simulation.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Quick Links</h4>
            <div className="space-y-2">
              {['Home', 'Exams', 'Mock Tests'].map(l => (
                <Link key={l} to={l === 'Home' ? '/' : `/${l.toLowerCase().replace(' ', '-')}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  {l}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Services</h4>
            <div className="space-y-2">
              {['Counselling', 'Premium Tests', 'Mentorship'].map(l => (
                <Link key={l} to="/services" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  {l}
                </Link>
              ))}
            </div>
          </div>

          {/* CONTACT + FOLLOW */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Contact</h4>

            <a href="tel:7720025900" className="block text-sm text-muted-foreground">
              +91 77200 25900
            </a>

            <a href="tel:7720081400" className="block text-sm text-muted-foreground">
              +91 77200 81400
            </a>

            <a href="mailto:contact@vidyarthimitra.org" className="block text-sm text-muted-foreground">
              contact@vidyarthimitra.org
            </a>

            <a href="mailto:info@vidyarthimitra.org" className="block text-sm text-muted-foreground">
              info@vidyarthimitra.org
            </a>

            {/* FOLLOW US */}
            <h4 className="font-semibold text-foreground mt-4 mb-2 text-sm">Follow Us</h4>

            <div className="flex gap-3">

              <a href="https://www.facebook.com/VidyarthiMitra.org/" target="_blank" rel="noopener noreferrer"
                className="bg-muted p-2 rounded hover:bg-primary hover:text-white transition">
                <Facebook size={18} />
              </a>

              <a href="https://x.com/Vidyarthimitra" target="_blank" rel="noopener noreferrer"
                className="bg-muted p-2 rounded hover:bg-primary hover:text-white transition">
                <Twitter size={18} />
              </a>

              <a href="https://www.linkedin.com/in/vidyarthi-mitra/" target="_blank" rel="noopener noreferrer"
                className="bg-muted p-2 rounded hover:bg-primary hover:text-white transition">
                <Linkedin size={18} />
              </a>

              <a href="https://www.instagram.com/vidyarthi_mitra/" target="_blank" rel="noopener noreferrer"
                className="bg-muted p-2 rounded hover:bg-primary hover:text-white transition">
                <Instagram size={18} />
              </a>

            </div>

          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Vidyarthi Mitra. All rights reserved.
        </div>
      </div>
    </footer>
  );
}