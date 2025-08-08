import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, BarChart3 } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // SEO: title, description, canonical
    document.title = "Sistema Inteligente de Tickets";
    const desc =
      "Crie e gerencie tickets com rapidez e precisão. IA classifica e prioriza automaticamente.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="container-responsive py-16 md:py-24">
            {/* Subtle glow background */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_60%)]"
            />

            <div className="mx-auto max-w-4xl text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Sistema Inteligente de Tickets
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Crie e gerencie tickets com rapidez e precisão. Nossa IA classifica
                automaticamente e prioriza o que importa.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button size="lg" onClick={() => navigate("/auth")}>Criar Conta</Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                  Fazer Login
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container-responsive pb-12 md:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-elevated hover-lift">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Chat Inteligente</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Converse naturalmente com nosso assistente para criar demandas
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated hover-lift">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Classificação Automática</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  IA analisa e classifica automaticamente a criticidade
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated hover-lift">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Métricas Avançadas</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Acompanhe performance e cumprimento em tempo real
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Social Proof (opcional) */}
        <section className="border-t border-border/60 bg-muted/20">
          <div className="container-responsive py-8 md:py-10">
            <div className="flex flex-wrap items-center justify-center gap-6 opacity-80">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Confiam em nós
              </span>
              {/* Placeholders */}
              <div className="h-6 w-24 rounded bg-muted" aria-hidden />
              <div className="h-6 w-24 rounded bg-muted" aria-hidden />
              <div className="h-6 w-24 rounded bg-muted" aria-hidden />
              <div className="h-6 w-24 rounded bg-muted" aria-hidden />
            </div>
          </div>
        </section>
      </main>

      <footer className="container-responsive py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Sistema Inteligente de Tickets
      </footer>
    </div>
  );
};

export default LandingPage;
