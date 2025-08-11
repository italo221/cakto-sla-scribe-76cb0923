import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LandingNavigation from "@/components/LandingNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, BarChart3, Zap, Target, CheckCircle, ArrowRight, Sparkles, Clock, Users, Brain, TrendingUp, Mail, Phone, MapPin, Star, Award, Headphones } from "lucide-react";

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
      {/* Header da Landing Page */}
      <header className="relative z-50">
        <LandingNavigation />
      </header>
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
                  <span className="block font-inter font-semibold">Sistema Inteligente</span>
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

        {/* Sobre o Sistema Section */}
        <section id="sobre" className="py-20 bg-muted/20">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Sobre o <span className="text-primary">Sistema</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Nossa plataforma de tickets inteligente utiliza Inteligência Artificial para revolucionar a gestão de demandas em empresas de todos os portes.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <Card className="text-left p-6 bg-card/80 border hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Para Quem Serve</h3>
                      <p className="text-muted-foreground">
                        Ideal para equipes de suporte, TI, atendimento ao cliente e qualquer departamento que precisa gerenciar solicitações de forma eficiente.
                      </p>
                    </div>
                  </div>
                </Card>
                
                <Card className="text-left p-6 bg-card/80 border hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Tecnologia IA</h3>
                      <p className="text-muted-foreground">
                        Processamento de linguagem natural que compreende contexto, prioriza automaticamente e sugere soluções baseadas em histórico.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Recursos Section */}
        <section id="recursos" className="py-20">
          <div className="container-responsive">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Recursos que <span className="text-primary">fazem a diferença</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Funcionalidades desenvolvidas para aumentar produtividade e melhorar a experiência do usuário
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Notificações em Tempo Real</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Receba atualizações instantâneas sobre mudanças de status e novos comentários
                  </p>
                </CardContent>
              </Card>

              <Card className="group transition-all duration-300 border bg-card/80 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Dashboards Avançados</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Visualize métricas de performance, SLA e tendências com gráficos interativos
                  </p>
                </CardContent>
              </Card>

              <Card className="group transition-all duration-300 border bg-card/80 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Gestão de Equipes</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Controle de permissões, distribuição de cargas e acompanhamento de produtividade
                  </p>
                </CardContent>
              </Card>

              <Card className="group transition-all duration-300 border bg-card/80 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Relatórios Inteligentes</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Insights automáticos e relatórios detalhados para tomada de decisões estratégicas
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
        <section id="como-funciona" className="py-20 bg-muted/20">
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
                  Digite ou fale sobre sua demanda. Nossa IA compreende linguagem natural e extrai informações relevantes automaticamente.
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
                  Sistema analisa contexto, histórico e define prioridade, categoria, setor responsável e estimativa de resolução.
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
                  Receba notificações instantâneas, monitore progresso através de dashboards e tenha acesso ao histórico completo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Planos e Preços Section */}
        <section id="planos" className="py-20">
          <div className="container-responsive">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Planos e <span className="text-primary">Preços</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Escolha o plano ideal para sua empresa e comece a transformar sua gestão de tickets hoje mesmo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Plano Básico */}
              <Card className="relative border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-8">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mb-4">
                    <Star className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Básico</CardTitle>
                  <p className="text-muted-foreground">Para pequenas equipes</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">Gratuito</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Até 100 tickets/mês</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Chat com IA básico</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">2 usuários inclusos</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Suporte por email</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-6" onClick={() => navigate("/auth")}>
                    Começar Grátis
                  </Button>
                </CardContent>
              </Card>

              {/* Plano Profissional */}
              <Card className="relative border-2 border-primary shadow-lg scale-105 bg-primary/5">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Mais Popular
                </div>
                <CardHeader className="text-center pb-8">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Profissional</CardTitle>
                  <p className="text-muted-foreground">Para equipes em crescimento</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">R$ 49</span>
                    <span className="text-muted-foreground">/usuário/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Tickets ilimitados</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">IA avançada com automações</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Usuários ilimitados</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Dashboards e relatórios</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Integrações APIs</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Suporte prioritário</span>
                    </div>
                  </div>
                  <Button className="w-full mt-6" onClick={() => navigate("/auth")}>
                    Teste 14 Dias Grátis
                  </Button>
                </CardContent>
              </Card>

              {/* Plano Enterprise */}
              <Card className="relative border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center pb-8">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-info/20 to-info/10 flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 text-info" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Enterprise</CardTitle>
                  <p className="text-muted-foreground">Para grandes organizações</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">Sob consulta</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Tudo do Profissional</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">SLA personalizado</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">White-label</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Integração dedicada</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm">Suporte 24/7</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-6" onClick={() => {
                    const element = document.getElementById('contato');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    Falar com Vendas
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contato Section */}
        <section id="contato" className="py-20 bg-muted/20">
          <div className="container-responsive">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Entre em <span className="text-primary">Contato</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Precisa de ajuda ou tem dúvidas? Nossa equipe está pronta para atendê-lo
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Informações de Contato */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold mb-6">Fale Conosco</h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground">contato@cakto.com.br</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Telefone</p>
                        <p className="text-muted-foreground">+55 (11) 9999-9999</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Headphones className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Suporte</p>
                        <p className="text-muted-foreground">Segunda a Sexta, 8h às 18h</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/10 to-info/10 p-6 rounded-2xl">
                  <h4 className="font-semibold mb-3">Demonstração Gratuita</h4>
                  <p className="text-muted-foreground mb-4">
                    Agende uma demonstração personalizada e veja como nosso sistema pode transformar sua gestão de tickets.
                  </p>
                  <Button onClick={() => navigate("/auth")} className="w-full">
                    Agendar Demo
                  </Button>
                </div>
              </div>

              {/* Formulário de Contato */}
              <Card className="p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Envie sua Mensagem</CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Empresa</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="Nome da sua empresa"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensagem</label>
                    <textarea
                      className="w-full px-3 py-2 border border-input rounded-md bg-background min-h-[120px] resize-none"
                      placeholder="Como podemos ajudá-lo?"
                    />
                  </div>
                  
                  <Button className="w-full mt-6">
                    Enviar Mensagem
                  </Button>
                </CardContent>
              </Card>
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
