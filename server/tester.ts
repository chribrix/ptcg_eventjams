export default defineEventHandler(async (event) => {
  // event can be used to access request objects like headers, query parameters, etc.
  // get route params
  const params = getRouterParams(event);

  // fetch some data from the net
  const res = await $fetch("https://jsonplaceholder.typicode.com/posts/1");
  console.log("Hello in server/index.ts");
  return "Hello wbbaaa server/index.ts";
});
