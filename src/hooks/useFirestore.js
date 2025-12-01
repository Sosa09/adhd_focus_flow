import { useState, useEffect } from 'react';
import { onCollectionSnapshot } from '../services/firebase';

export function useFirestore(collectionName, user, sortFn) {
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) {
            setData([]);
            return;
        };

        const unsub = onCollectionSnapshot(
            user.uid,
            collectionName,
            (snapshotData) => {
                const sortedData = sortFn ? snapshotData.sort(sortFn) : snapshotData;
                setData(sortedData);
            },
            (err) => {
                console.error(`${collectionName} sync error:`, err);
                setError(`Error syncing ${collectionName}.`);
            }
        );

        return () => unsub();
    }, [user, collectionName, sortFn]);

    return { data, error };
}