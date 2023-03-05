import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { GraphQLQuery, GraphQLSubscription } from '@aws-amplify/api';
import { ListProductsQuery, OnCreateProductSubscription, OnDeleteProductSubscription, OnUpdateProductSubscription } from './API';
import * as subscriptions from './graphql/subscriptions';
import * as queries from './graphql/queries';

function App() {

  const [products, setProducts] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await API.graphql<GraphQLQuery<ListProductsQuery>>(
        graphqlOperation(queries.listProducts)
      );
      // @ts-ignore  // FIXME
      setProducts(data?.listProducts.items || []);
    })();
  }, []);

  // @ts-ignore
  const create = (nouvo) => {
    // @ts-ignore
    setProducts(prev => [nouvo, ...prev]);
  };

  // @ts-ignore
  const update = (nouvo) => {
    // @ts-ignore
    setProducts(prev => {
      // @ts-ignore
      const i = prev.findIndex(p => p.id === nouvo.id);
      return [
        ...prev.slice(0, i),
        nouvo,
        ...prev.slice(i+1),
      ];
    });
  };

  // @ts-ignore
  const unlink = (deleted) => {
    setProducts(prev => {
      // @ts-ignore
      const i = prev.findIndex(p => p.id === deleted.id);
      return [
        ...prev.slice(0, i),
        ...prev.slice(i+1),
      ];
    });
  };

  useEffect(() => {
    const createSub = API.graphql<GraphQLSubscription<OnCreateProductSubscription>>(
      graphqlOperation(subscriptions.onCreateProduct)
    ).subscribe({
      // @ts-ignore
      next: ({ value }) => create(value.data.onCreateProduct),
      error: (error) => console.error(error),
    });
    const updateSub = API.graphql<GraphQLSubscription<OnUpdateProductSubscription>>(
      graphqlOperation(subscriptions.onUpdateProduct)
    ).subscribe({
      // next: ({ provider, value }) => console.log({ provider, value }),
      // @ts-ignore
      next: ({ provider, value }) => update(value.data.onUpdateProduct),
      error: (error) => console.error(error),
    });
    const deleteSub = API.graphql<GraphQLSubscription<OnDeleteProductSubscription>>(
      graphqlOperation(subscriptions.onDeleteProduct)
    ).subscribe({
      next: ({ value })=> unlink(value.data?.onDeleteProduct),
      error: (error) => console.error(error),
    });

    return () => {
      createSub.unsubscribe();
      updateSub.unsubscribe();
      deleteSub.unsubscribe();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Magic of Capture-Data-Change
        </p>
      </header>
      <main>
        <table>
          <tr>
            <th>ID</th>
            <th>Name</th>
          </tr>
          {products.map((product, key) => (
            <tr key={key}>
              {/*
              // @ts-ignore */}
              <td>{product.id}</td>
              {/*
              // @ts-ignore */}
              <td>{product.name}</td>
            </tr>
          ))}
        </table>
      </main>
    </div>
  );
}

export default App;
