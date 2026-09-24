const users = new Map([["u_1", { id: "u_1", name: "Ada" }]]);

export function handleUserLookup(request) {
  const user = users.get(request.query.id);
  if (!user) return { status: 500, body: { message: "failed" } };
  return { status: 200, body: user };
}
