// centralizziamo i permessi e requirement prima che ogni tool venga invocata (ad esempio internet check, e domandare se si puo' procedere con il tool)
type ToolPolicy = {
  requiresInternet?: boolean;
  requiresPermission?: boolean;
};

export const toolPolicies: Record<string, ToolPolicy> = {
  // Questo file non serve tanto per controllare il wifi xke lo facciamo gia in agent.ts(anche fa sempre bene controllare xke il wifi si puo' spegnere durante la tool chain loop)
  // serve piu' per dare occasione allo user di dare i permessi al modello di procedere ad usare
  // le tool quando queste fanno operazioni OS sensibili.
  generate_pdf: {
    // must have same name as the tool description to work
    requiresInternet: false,
    requiresPermission: false,
  },
  check_wifi: {
    // must have same name as the tool description to work
    requiresInternet: false,
    requiresPermission: true,
  },
  enable_wifi: {
    requiresInternet: false,
    requiresPermission: true,
  },
  connect_wifi: {
    requiresInternet: false,
    requiresPermission: true,
  },
};
