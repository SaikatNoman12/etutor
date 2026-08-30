// Route module: the authenticated-student area of the app.
//
// design/manifest.json marks seven screens `auth:student` (cart, checkout, orders,
// order detail, my-learning, the course player, profile). Nothing in the app enforced
// that -- the guard components were generated but wired to no route, so every one of
// those pages rendered for an anonymous visitor and only failed later, as an empty list
// or a 401 from the API. Mounting them under this layout is what makes the manifest's
// guard column true in the running app.
//
// The role travels as the numeric JWT claim (RULE-B8), hence user_role.STUDENT rather
// than a 'student' string.
import { ProtectedLayout } from '~/components/guards/ProtectedLayout';
import { user_role } from '~/enums/user-role.enum';

export default function StudentProtectedRoute() {
  return <ProtectedLayout roles={[user_role.STUDENT]} loginPath="/signin" forbiddenPath="/" />;
}
