export default (io: Summon.IO) => {
  let alicePrefs: boolean[] = [];
  let bobPrefs: boolean[] = [];

  for (let i = 0; i < 7; i++) {
    alicePrefs.push(io.input('alice', `aliceWeekday${i}`, summon.bool()));
    bobPrefs.push(io.input('bob', `bobWeekday${i}`, summon.bool()));
  }

  let result = 255;

  for (let i = 6; i >= 0; i--) {
    if (alicePrefs[i] && bobPrefs[i]) {
      result = i;
    }
  }

  io.outputPublic('result', result);

  // const a = io.input('alice', 'a', summon.number());
  // const b = io.input('bob', 'b', summon.number());

  // let result;

  // if (isEqual(a, b)) {
  //   result = 0;
  // } else if (isLarger(a, b)) {
  //   result = 1;
  // } else {
  //   result = 2;
  // }

  // io.outputPublic('main', result);
};
