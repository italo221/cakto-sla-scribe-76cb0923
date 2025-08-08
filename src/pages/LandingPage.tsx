import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, BarChart3, Zap, Target, CheckCircle, ArrowRight, Sparkles } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // SEO: title, description, canonical
    document.title = "Sistema Inteligente de Tickets - Cakto";
    const desc =
      "Transforme sua gestão de tickets com IA. Classifique automaticamente, priorize demandas e acompanhe métricas em tempo real.";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 text-foreground overflow-x-hidden">
      {/* Header integrado */}
      <header className="landing-header relative z-50">
        <Navigation />
      </header>

      <style>{`
        /* Landing-only Navigation integration */
        header.landing-header .sticky { padding: 0.5rem 0.75rem; }
        header.landing-header .sticky > div { background: transparent !important; box-shadow: none !important; border: 0 !important; backdrop-filter: none !important; }
        header.landing-header .container-responsive > .flex { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
      `}</style>
      <main className="relative">
        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          {/* Background elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-info/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-primary/20 via-info/10 to-primary/20 rounded-full blur-3xl" />
          </div>

          {/* Floating icons */}
          <div className="absolute inset-0 -z-5 pointer-events-none">
            <div className="absolute top-[20%] left-[10%] animate-pulse">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary/60" />
              </div>
            </div>
            <div className="absolute top-[60%] right-[15%] animate-pulse delay-1000">
              <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary/40" />
              </div>
            </div>
            <div className="absolute bottom-[30%] left-[20%] animate-pulse delay-500">
              <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary/50" />
              </div>
            </div>
          </div>

          <div className="container-responsive py-16 md:py-24">
            <div className="mx-auto max-w-5xl text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-serif font-medium tracking-tight text-foreground">
                  <span className="block font-semibold">Sistema Inteligente</span>
                  <span className="block italic text-foreground/90">de Tickets</span>
                </h1>
                <p className="text-lg md:text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed">
                  Utilize nosso assistente de IA para criar tickets de forma rápida e precisa, com classificação automática.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <Button 
                  size="lg" 
                  className="text-base md:text-lg px-8 py-6 h-auto rounded-full btn-gradient shadow-lg hover:shadow-elevated transition-all duration-300 group"
                  onClick={() => navigate("/auth")}
                >
                  Criar Ticket Agora
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base md:text-lg px-8 py-6 h-auto rounded-full border-primary/30 hover:bg-primary/5"
                  onClick={() => navigate("/auth")}
                >
                  Fazer Login
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/20">
          <div className="container-responsive">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Funcionalidades que <span className="text-primary">revolucionam</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Tecnologia de ponta para automatizar e otimizar seu fluxo de trabalho
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="group transition-all duration-300 border bg-card/80 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Chat Inteligente</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Converse naturalmente com nosso assistente IA para criar e gerenciar tickets de forma intuitiva
                  </p>
                </CardContent>
              </Card>

              <Card className="group transition-all duration-300 border bg-card/80 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Classificação Automática</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    IA analisa conteúdo e contexto para classificar automaticamente prioridade e categoria
                  </p>
                </CardContent>
              </Card>

              <Card className="group transition-all duration-300 border bg-card/80 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Métricas Avançadas</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Dashboards em tempo real com insights detalhados sobre performance e SLA
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-10">
          <div className="container-responsive">
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-70">
              <div className="h-8 w-24 rounded bg-muted" aria-hidden="true" />
              <div className="h-8 w-24 rounded bg-muted" aria-hidden="true" />
              <div className="h-8 w-24 rounded bg-muted" aria-hidden="true" />
              <div className="h-8 w-24 rounded bg-muted" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* Como Funciona Section */}
        <section className="py-20">
          <div className="container-responsive">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Como <span className="text-primary">funciona</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Processo simples e eficiente em poucos passos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-white text-2xl font-bold shadow-md group-hover:scale-105 transition-transform">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Descreva o Problema</h3>
                <p className="text-muted-foreground">
                  Digite ou fale sobre sua demanda. Nossa IA compreende linguagem natural.
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-white text-2xl font-bold shadow-md group-hover:scale-105 transition-transform">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">IA Classifica Automaticamente</h3>
                <p className="text-muted-foreground">
                  Sistema analisa e define prioridade, categoria e responsável adequado.
                </p>
              </div>

              <div className="text-center group">
                <div className="relative mb-6">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-white text-2xl font-bold shadow-md group-hover:scale-105 transition-transform">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Acompanhe em Tempo Real</h3>
                <p className="text-muted-foreground">
                  Receba notificações e monitore o progresso através de dashboards intuitivos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 bg-gradient-to-r from-primary/10 via-info/10 to-primary/10">
          <div className="container-responsive text-center">
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Pronto para <span className="text-primary">revolucionar</span> sua gestão?
              </h2>
              <p className="text-xl text-muted-foreground">
                Junte-se a milhares de equipes que já transformaram seu fluxo de trabalho
              </p>
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 h-auto rounded-full btn-gradient shadow-lg hover:shadow-elevated transition-all duration-300"
                onClick={() => navigate("/auth")}
              >
                Começar Agora Gratuitamente
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container-responsive py-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} Cakto - Sistema Inteligente de Tickets. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
