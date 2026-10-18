# Wedding party photos

Drop real photos in this folder to fill the cards on the Wedding Party page.
No code changes are needed: each card already points at a predictable
filename, and until a file exists the card shows an empty gilt frame.

Each wedding party member hangs in one picture frame. Use a `.jpg` named
after the person. A portrait crop with the face in the upper middle looks
best — the frames are taller than they are wide, and the photo is clipped
to the frame's window.

## Laura and William

These six are of the couple, not the wedding party, and are not shown
anywhere yet.

| File            | What's in it                                            |
| --------------- | ------------------------------------------------------- |
| `img_3967.jpg`  | On a football field at night                            |
| `img_3968.jpg`  | With two dogs at Christmas                              |
| `img_3969.jpg`  | Under the Zehnder's sign in Frankenmuth, in the snow    |
| `img_3970.jpg`  | Piggyback on a beach under a blue sky                   |
| `img_3971.jpg`  | Skiing in hockey jerseys                                |
| `img_3972.jpg`  | Selfie on a boardwalk above Lake Michigan               |

## Bride's side

| Person | File         |
| ------ | ------------ |
| Paige  | `paige.jpg`  |
| Ginger | `ginger.jpg` |
| Erica  | `erica.jpg`  |
| Ali    | `ali.jpg`    |
| Ashtyn | `ashtyn.jpg` |
| Jacey  | `jacey.jpg`  |
| Maddie | `maddie.jpg` |
| Rachel | `rachel.jpg` |

## Groom's side

| Person | File         |
| ------ | ------------ |
| James  | `james.jpg`  |
| Andrew | `andrew.jpg` |
| Nick   | `nick.jpg`   |
| Tim    | `tim.jpg`    |
| Gabe   | `gabe.jpg`   |
| Thomas | `thomas.jpg` |
| Ethan  | `ethan.jpg`  |
| Eddy   | `eddy.jpg`   |

## Parents

Amy and Ron's card is the expandable kind and supports up to two photos,
with `-2` for the second. A photo slot stays hidden until its file exists.

| People        | File 1              | File 2                |
| ------------- | ------------------- | --------------------- |
| Amy and Ron   | `amy-and-ron.jpg`   | `amy-and-ron-2.jpg`   |

## The Family

The round portraits on the Family chapter live in `family/<name>.jpg`
(square crops of the face), and each household card ends with one group
photo: `family/restums.jpg` and `family/bergkamps.jpg`. Teal has no photo
yet; add `family/teal.jpg` and swap her placeholder for an `<img>` like
the others.

Julie and Gil's card is a plain nameplate for now; it will need a tribute
and its photo slots added back before it opens like Amy and Ron's.
