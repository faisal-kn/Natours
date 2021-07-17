/*eslint-disable*/
import axios from 'axios';

export const bookTour = async (tourId) => {
  const stripe = Stripe(
    'pk_test_51JDvf6SAPK2Nlfh218NBVfP3JY56cs3tce6L6A9agvjfenk47pVB8AjxRJMoMrO10qbXpNB8q4ccKKPJNRommlSX00FTaTBq12'
  );
  const session = await axios(
    `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
  );
  console.log(session);

  //Create a checkout form to charge the credit card
  await stripe.redirectToCheckout({
    sessionId: session.data.session.id,
  });
};
