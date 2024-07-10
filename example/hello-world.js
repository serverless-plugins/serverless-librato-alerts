'use strict';

module.exports.handler = async () => {
  const timeToWait = 5000 + Math.random() * 10000;
  // eslint-disable-next-line no-console
  console.log(`Waiting ${timeToWait}ms...`);
  await new Promise((resolve) => {
    setTimeout(resolve, timeToWait);
  });

  return 'Success!';
};
