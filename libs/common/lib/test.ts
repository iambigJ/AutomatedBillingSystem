const x = {
  a: 1,
  b: 2,
  c: 3,
};

const z = Object.entries(x);
console.dir(z, { depth: null });
//@ts-ignore
const y = z.map(([key, value ,a]) => {
  console.log(key, value, a);
});
console.dir(y, { depth: null });
