import useScript from "../useScript";

const Plane = ({ script }: { script: Script }) => {
  const constructorReturnValue = useScript(script, 'constructor?', {
    once: true
  });


  useScript(script, 'default');
}

export default Plane;